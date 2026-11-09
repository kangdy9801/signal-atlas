"""Signal Atlas v4.1 extra public sources.

1) S&P500 forward 12M earnings yield  <- FactSet Earnings Insight (weekly free PDF)
2) Fed rate-cut pivot                 <- FRED DFEDTARU (fed funds target upper bound)
3) Central bank gold buying vs. year-ago quarter <- World Gold Council Gold Demand Trends

Rules (user-defined, 2026-11-09):
- Fed: count cuts since the most recent hike. 1 cut = watch (관심, not a pivot). 2+ cuts = pivot.
- Central-bank gold: compare the latest quarter's net purchases with the SAME quarter a year earlier.
  maintained = latest > 0 and latest >= year-ago ; declining = latest < year-ago.
Every parser validates ranges and freshness. Failure -> null + issue, never an invented value.
"""
from __future__ import annotations

import csv
import io
import re
import urllib.request
from datetime import date, timedelta

FACTSET_URL = ('https://advantage.factset.com/hubfs/Website/Resources%20Section/Research%20Desk/'
               'Earnings%20Insight/EarningsInsight_{d}.pdf')
FRED_URL = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=DFEDTARU'
WGC_URL = 'https://www.gold.org/goldhub/research/gold-demand-trends/gold-demand-trends-q{q}-{y}/central-banks'

FACTSET_MAX_AGE_DAYS = 14   # weekly report; older than two weeks is not used
FRED_MAX_AGE_DAYS = 10
WGC_MAX_QUARTER_AGE_DAYS = 200
UA = 'Mozilla/5.0 (compatible; SignalAtlas/4.1; +https://kangdy9801.github.io/signal-atlas/)'


def http_get(url, max_bytes=15_000_000):
    request = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*'})
    with urllib.request.urlopen(request, timeout=30) as resp:
        if resp.status != 200:
            raise ValueError(f'HTTP {resp.status}')
        content = resp.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise ValueError('response too large')
    if not content:
        raise ValueError('empty response')
    return content


def pdf_text(content: bytes, max_pages=20):
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(content))
    return '\n'.join((page.extract_text() or '') for page in reader.pages[:max_pages])


def squash(text):
    return re.sub(r'\s+', ' ', text or '')


# ---------------------------------------------------------------- FactSet ---------
PE_RE = re.compile(r'forward\s*12\s*-?\s*month\s+P\s*/\s*E\s+ratio\s+for\s+the\s+S\s*&\s*P\s*500\s+is\s+(\d{1,2}\.\d{1,2})', re.I)
PRICE_RE = re.compile(r'(?:above|below)\s+the\s+closing\s+price\s+of\s+(\d{1,2},?\d{3}\.\d{1,2})', re.I)


def factset_candidates(today: date):
    """FactSet publishes on Friday (sometimes Thursday). Newest first."""
    for back in range(0, FACTSET_MAX_AGE_DAYS + 1):
        day = today - timedelta(days=back)
        if day.weekday() in (3, 4):
            yield day, FACTSET_URL.format(d=day.strftime('%m%d%y'))


def factset_to_fields(text, report_day: date, url, spx_close=None, spx_day=None):
    flat = squash(text)
    match = PE_RE.search(flat)
    if not match:
        raise ValueError('forward 12-month P/E sentence not found')
    pe = float(match.group(1))
    if not 5 <= pe <= 60:
        raise ValueError(f'unreasonable forward P/E {pe}')
    price_match = PRICE_RE.search(flat)
    report_price = float(price_match.group(1).replace(',', '')) if price_match else None
    if report_price is not None and not 500 <= report_price <= 50_000:
        report_price = None
    detail = {
        'provider': 'FactSet Earnings Insight', 'url': url, 'marketDate': report_day.isoformat(),
        'forwardPE': pe, 'reportClose': report_price,
    }
    usable_spx = (isinstance(spx_close, (int, float)) and spx_close > 0 and spx_day is not None
                  and spx_day >= report_day - timedelta(days=3))
    if report_price and usable_spx:
        eps = report_price / pe
        value = eps / spx_close * 100
        detail.update({
            'impliedForwardEPS': round(eps, 2), 'spxClose': spx_close, 'marketDate': spx_day.isoformat(),
            'definition': 'Forward 12M EPS implied by FactSet (report close / forward P/E) divided by latest S&P500 close',
        })
    else:
        value = 100 / pe
        detail['definition'] = '100 / FactSet forward 12-month P/E (weekly)'
    return round(value, 3), detail


def collect_factset(today, get=http_get, to_text=pdf_text, spx_close=None, spx_day=None):
    errors = []
    for day, url in factset_candidates(today):
        try:
            text = to_text(get(url))
            value, detail = factset_to_fields(text, day, url, spx_close, spx_day)
            return {'earningsYield': value}, {'earningsYield': detail}, errors, {
                'reportDate': day.isoformat(), 'mappedFields': ['earningsYield']}
        except Exception as error:  # 404 for non-publication days is expected
            errors.append(f'{day.isoformat()}: {str(error)[:80]}')
    raise ValueError('no FactSet report within 14 days (' + '; '.join(errors[-3:]) + ')')


# ---------------------------------------------------------------- FRED ------------
def fed_from_csv(text, today: date):
    rows = list(csv.reader(io.StringIO(text)))
    series = []
    for row in rows[1:]:
        if len(row) < 2:
            continue
        try:
            day, value = date.fromisoformat(row[0][:10]), float(row[1])
        except ValueError:
            continue  # FRED marks missing values with '.'
        if day <= today and 0 <= value <= 25:
            series.append((day, value))
    if len(series) < 100:
        raise ValueError('too few fed funds target observations')
    series.sort()
    last_day, current = series[-1]
    if (today - last_day).days > FRED_MAX_AGE_DAYS:
        raise ValueError(f'stale fed funds target (last {last_day})')
    changes = [(day, value - prev) for (_, prev), (day, value) in zip(series, series[1:]) if abs(value - prev) > 1e-9]
    hikes = [day for day, delta in changes if delta > 0]
    last_hike = hikes[-1] if hikes else None
    cuts = [(day, delta) for day, delta in changes if delta < 0 and (last_hike is None or day > last_hike)]
    count = len(cuts)
    detail = {
        'provider': 'FRED (St. Louis Fed)', 'url': FRED_URL, 'marketDate': last_day.isoformat(),
        'definition': 'Cuts to the fed funds target upper bound since the most recent hike. 1 = watch, 2+ = pivot',
        'targetUpper': current, 'lastHike': last_hike.isoformat() if last_hike else None,
        'cutsSinceLastHike': count,
        'recentCuts': [{'date': d.isoformat(), 'changePct': round(x, 2)} for d, x in cuts[-6:]],
        'stage': 'pivot' if count >= 2 else 'watch' if count == 1 else 'none',
    }
    values = {'fedCutPivot': count >= 2, 'fedCutCount': count}
    return values, {'fedCutPivot': detail, 'fedCutCount': dict(detail)}


def collect_fred(today, get=http_get):
    text = get(FRED_URL, 2_000_000).decode('utf-8-sig')
    values, details = fed_from_csv(text, today)
    return values, details, [], {'mappedFields': sorted(values)}


# ---------------------------------------------------------------- WGC -------------
WGC_PATTERNS = [
    re.compile(r'net\s+(?:official\s+sector\s+)?purchases\s+(?:of|totall?ed|reached|were|at)\s+(?:an?\s+)?(?:[a-z]+\s+){0,2}?(-?\d{1,4}(?:\.\d)?)\s?(?:t|tonnes)\b', re.I),
    re.compile(r'central\s+bank\s+(?:demand|buying)\s+(?:reached|of|totall?ed|was|at)\s+(-?\d{1,4}(?:\.\d)?)\s?(?:t|tonnes)\b', re.I),
    re.compile(r'rose\s+by\s+a\s+net\s+(\d{1,4}(?:\.\d)?)\s?(?:t|tonnes)\b', re.I),
]


def html_to_text(raw: str):
    raw = re.sub(r'(?is)<(script|style|noscript)[^>]*>.*?</\1>', ' ', raw)
    raw = re.sub(r'(?s)<[^>]+>', ' ', raw)
    raw = raw.replace('&nbsp;', ' ').replace('&amp;', '&')
    return squash(raw)


def wgc_tonnes(text):
    """First stated quarterly central-bank net purchase figure on the WGC central-banks page."""
    best = None
    for pattern in WGC_PATTERNS:
        match = pattern.search(text)
        if match and (best is None or match.start() < best.start()):
            best = match
    if not best:
        raise ValueError('quarterly net purchase sentence not found')
    tonnes = float(best.group(1))
    if not -1000 <= tonnes <= 1500:
        raise ValueError(f'unreasonable tonnes {tonnes}')
    return tonnes


def completed_quarters(today: date, count=2):
    q, y = (today.month - 1) // 3, today.year  # quarter index of last completed quarter (0 means Q4 of last year)
    if q == 0:
        q, y = 4, y - 1
    out = []
    for _ in range(count):
        out.append((q, y))
        q, y = (q - 1, y) if q > 1 else (4, y - 1)
    return out


def quarter_end(q, y):
    return date(y + (q == 4), (q * 3) % 12 + 1, 1) - timedelta(days=1)


def collect_wgc(today, get=http_get):
    errors = []
    for q, y in completed_quarters(today):
        if (today - quarter_end(q, y)).days > WGC_MAX_QUARTER_AGE_DAYS:
            break
        try:
            url_now, url_ago = WGC_URL.format(q=q, y=y), WGC_URL.format(q=q, y=y - 1)
            latest = wgc_tonnes(html_to_text(get(url_now, 5_000_000).decode('utf-8', 'replace')))
            year_ago = wgc_tonnes(html_to_text(get(url_ago, 5_000_000).decode('utf-8', 'replace')))
        except Exception as error:
            errors.append(f'Q{q} {y}: {str(error)[:80]}')
            continue
        label = f'{y}-Q{q}'
        detail = {
            'provider': 'World Gold Council (Gold Demand Trends)', 'url': url_now, 'reportMonth': label,
            'latestTonnes': latest, 'yearAgoTonnes': year_ago, 'yearAgoUrl': url_ago,
            'definition': 'Quarterly central bank net purchases vs. same quarter a year earlier (year-ago value as first published)',
        }
        values = {'cbBuyingMaintained': latest > 0 and latest >= year_ago, 'cbBuyingDeclining': latest < year_ago}
        return values, {k: dict(detail) for k in values}, errors, {'reportMonth': label, 'mappedFields': sorted(values)}
    raise ValueError('no recent WGC central bank quarter (' + '; '.join(errors) + ')')
