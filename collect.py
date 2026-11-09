"""Signal Atlas public-feed ingestion for GitHub Actions.

Only source-backed, recent, schema-validated observations may drive rules.
Input repositories remain read-only. No Telegram / trading / credential storage.
"""
from __future__ import annotations

import json
import math
import re
import sys
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import collect_extra as extra

ROOT = Path(__file__).resolve().parent
URLS = {
    'macro-dashboard': [
        'https://raw.githubusercontent.com/kangdy9801/macro-dashboard/main/data/market.json',
        'https://kangdy9801.github.io/macro-dashboard/data/market.json',
    ],
    'kr-trade-monitor': [
        'https://raw.githubusercontent.com/kangdy9801/kr-trade-monitor/main/assets/seed.js',
        'https://kangdy9801.github.io/kr-trade-monitor/assets/seed.js',
    ],
}
MAX_BYTES = 2_000_000
DAILY_MAX_AGE_DAYS = 8
TRADE_MAX_AGE_DAYS = 75
FIELDS = [
    'spDraw', 'earningsYield', 'treasuryYield', 'aiDraw', 'kospiDraw', 'kospiForwardPER',
    'semiExportM1', 'semiExportM2', 'semiExportM3', 'semiExportM4',
    'memoryPriceM1', 'memoryPriceM2', 'memoryTwoMonthDecline',
    'goldDraw', 'cbBuyingMaintained', 'fedCutPivot', 'fedCutCount', 'usRatesRising',
    'cbBuyingDeclining', 'portfolioDraw',
]


def valid_number(x):
    return isinstance(x, (float, int)) and not isinstance(x, bool) and math.isfinite(x)


def fetch_text(name, urls=None):
    """Fetch a public data file. URL response is data, never executed as code."""
    errors = []
    for url in urls or URLS[name]:
        try:
            request = urllib.request.Request(url, headers={
                'User-Agent': 'SignalAtlas/4.0 research-dashboard',
                'Accept': 'application/json, text/javascript, */*',
            })
            with urllib.request.urlopen(request, timeout=20) as resp:
                if resp.status != 200:
                    raise ValueError(f'HTTP {resp.status}')
                content = resp.read(MAX_BYTES + 1)
            if len(content) > MAX_BYTES:
                raise ValueError('file larger than 2 MB')
            if not content:
                raise ValueError('empty response')
            return content.decode('utf-8-sig'), url
        except Exception as error:
            errors.append(f'{url}: {str(error)[:100]}')
    raise RuntimeError(' | '.join(errors))


def iso_day(x):
    if not isinstance(x, str):
        return None
    match = re.match(r'^(\d{4}-\d{2}-\d{2})', x)
    if not match:
        return None
    try:
        return date.fromisoformat(match.group(1))
    except ValueError:
        return None


def is_recent(day: date | None, today: date, max_age: int):
    return day is not None and timedelta(days=-1) <= today - day <= timedelta(days=max_age)


def price_drawdown(rows, today: date):
    """1-year closing high, computed using only actual finite, dated closes."""
    dated = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        day, val = iso_day(row.get('time')), row.get('close')
        if day and day <= today + timedelta(days=1) and valid_number(val) and val > 0:
            dated[day] = float(val)
    if len(dated) < 25:
        raise ValueError('insufficient dated price observations')
    last_day = max(dated)
    if not is_recent(last_day, today, DAILY_MAX_AGE_DAYS):
        raise ValueError(f'stale price (last {last_day.isoformat()})')
    window = {k: v for k, v in dated.items() if k >= last_day - timedelta(days=365)}
    if len(window) < 25:
        raise ValueError('insufficient 1-year observations')
    latest, peak = dated[last_day], max(window.values())
    return round(max(0.0, (peak - latest) / peak * 100), 3), last_day.isoformat(), round(latest, 4), round(peak, 4)


def latest_value(rows, today):
    pairs = []
    for row in rows:
        if isinstance(row, dict):
            day, val = iso_day(row.get('time')), row.get('value')
            if day and day <= today + timedelta(days=1) and valid_number(val):
                pairs.append((day, float(val)))
    if not pairs:
        raise ValueError('no valid daily values')
    last_day, value = max(pairs)
    if not is_recent(last_day, today, DAILY_MAX_AGE_DAYS):
        raise ValueError(f'stale yield (last {last_day.isoformat()})')
    if not (0 <= value <= 20):
        raise ValueError('unreasonable Treasury yield')
    return round(value, 3), last_day.isoformat()


def macro_to_fields(raw: str, today: date):
    payload = json.loads(raw)
    if not isinstance(payload, dict) or not isinstance(payload.get('series'), list):
        raise ValueError('macro feed missing series[]')
    series = {entry['id']: entry for entry in payload['series'] if isinstance(entry, dict) and isinstance(entry.get('id'), str)}
    values, details, errors = {}, {}, []
    for sid, key in (('spx', 'spDraw'), ('gold', 'goldDraw')):
        try:
            entry = series[sid]
            draw, day, latest, peak = price_drawdown(entry.get('data', []), today)
            values[key] = draw
            details[key] = {
                'provider': 'Macro Dashboard', 'url': URLS['macro-dashboard'][0], 'marketDate': day,
                'definition': f'{sid} USD close; drawdown from highest closing price in trailing 365 days',
                'currentClose': latest, 'peakClose': peak, 'originalSource': entry.get('source', ''),
            }
        except (KeyError, ValueError, TypeError) as error:
            errors.append(f'macro {sid}: {error}')
    try:
        entry = series['us10y']
        yld, day = latest_value(entry.get('data', []), today)
        values['treasuryYield'] = yld
        details['treasuryYield'] = {
            'provider': 'Macro Dashboard', 'url': URLS['macro-dashboard'][0], 'marketDate': day,
            'definition': 'US 10-year Treasury constant maturity yield, percentage points',
            'originalSource': entry.get('source', ''),
        }
    except (KeyError, ValueError, TypeError) as error:
        errors.append(f'macro us10y: {error}')
    if not values:
        raise ValueError('macro had no usable recent spx, gold or us10y observations')
    return values, details, errors, {
        'sourceUpdated': payload.get('updated'),
        'availableSeries': sorted(series.keys()),
        'mappedFields': sorted(values),
    }


def seed_records_from_js(source):
    """Strictly decode literal JSON in window.KTM_SEED = [...]. No JavaScript evaluation."""
    match = re.search(r'(?:window\s*\.\s*)?KTM_SEED\s*=\s*', source)
    if not match:
        raise ValueError('KTM_SEED assignment missing')
    records, _ = json.JSONDecoder().raw_decode(source[match.end():].lstrip())
    if not isinstance(records, list) or len(records) > 200:
        raise ValueError('KTM_SEED must be an array with at most 200 monthly records')
    return records


def month_label(year, month):
    return f'{year:04d}-{month:02d}'


def kr_to_fields(source: str, today: date):
    records = seed_records_from_js(source)
    valid = []
    for rec in records:
        if not isinstance(rec, dict) or not isinstance(rec.get('trade'), dict):
            continue
        trade = rec['trade']
        year, month = trade.get('year'), trade.get('month')
        if isinstance(year, int) and isinstance(month, int) and 2020 <= year <= 2100 and 1 <= month <= 12:
            valid.append((year * 100 + month, rec))
    if not valid:
        raise ValueError('no records with trade.year and trade.month')
    _, latest = max(valid, key=lambda pair: pair[0])
    trade = latest['trade']
    year, month = trade['year'], trade['month']
    report_date = date(year, month, 1)
    # Publication can occur in the following month. Monthly reports may lag the market.
    end_month = date(year + (month == 12), month % 12 + 1, 1) - timedelta(days=1)
    if not is_recent(end_month, today, TRADE_MAX_AGE_DAYS):
        raise ValueError(f'stale KR report: {month_label(year, month)} (last month-end {end_month})')
    meta = {
        'reportMonth': month_label(year, month),
        'recordCount': len(valid),
        'mappedFields': [],
        'note': 'Only published seed.js records are available. Browser-only uploads in the upstream dashboard are NOT included.',
    }
    values, details, errors = {}, {}, []
    semi = (trade.get('items') or {}).get('반도체')
    yoy = semi.get('yoy') if isinstance(semi, dict) else None
    if isinstance(yoy, list) and len(yoy) >= 4 and all(valid_number(x) for x in yoy[-4:]):
        # Oldest-to-newest, four monthly YoY rates; 3 consecutive slowdowns = 3 decreases.
        for idx, value in enumerate(yoy[-4:], start=1):
            key = f'semiExportM{idx}'
            values[key] = round(float(value), 3)
            details[key] = {
                'provider': 'KR Trade Monitor', 'url': URLS['kr-trade-monitor'][0],
                'reportMonth': month_label(year, month),
                'definition': f'Semiconductor export YoY growth: window observation {idx}/4 (oldest to newest), %',
            }
    else:
        errors.append('kr: missing last 4 numeric values for trade.items[반도체].yoy')
    memory = trade.get('memory') if isinstance(trade.get('memory'), dict) else {}
    ddr, nand = memory.get('ddr5'), memory.get('nand')
    if (isinstance(ddr, list) and isinstance(nand, list) and len(ddr) >= 3 and len(nand) >= 3
            and all(valid_number(x) and x > 0 for x in ddr[-3:] + nand[-3:])):
        dm1, dm2 = (ddr[-2] / ddr[-3] - 1) * 100, (ddr[-1] / ddr[-2] - 1) * 100
        nm1, nm2 = (nand[-2] / nand[-3] - 1) * 100, (nand[-1] / nand[-2] - 1) * 100
        # These numbers show DDR5 benchmark MoM. The authoritative boolean requires BOTH DDR5 and NAND declining twice.
        for key, val, label in [('memoryPriceM1', dm1, 'previous'), ('memoryPriceM2', dm2, 'latest')]:
            values[key] = round(val, 3)
            details[key] = {
                'provider': 'KR Trade Monitor', 'url': URLS['kr-trade-monitor'][0],
                'reportMonth': month_label(year, month),
                'definition': f'DDR5 16Gb fixed price month-on-month growth (%) — {label} month',
            }
        values['memoryTwoMonthDecline'] = all(x < 0 for x in (dm1, dm2, nm1, nm2))
        details['memoryTwoMonthDecline'] = {
            'provider': 'KR Trade Monitor', 'url': URLS['kr-trade-monitor'][0],
            'reportMonth': month_label(year, month),
            'definition': 'Both DDR5 16Gb and NAND 128Gb fixed prices declined in each of last 2 months',
            'ddr5Mom': [round(dm1, 3), round(dm2, 3)],
            'nandMom': [round(nm1, 3), round(nm2, 3)],
        }
    else:
        errors.append('kr: missing last 3 positive numeric DDR5 and NAND fixed prices')
    meta['mappedFields'] = sorted(values)
    if not values:
        raise ValueError('KR latest seed record has no validated semiconductor data')
    return values, details, errors, meta


def fallback_drawdown(ticker, today):
    import yfinance as yf
    frame = yf.Ticker(ticker).history(period='15mo', interval='1d', auto_adjust=True)
    if frame is None or frame.empty:
        raise ValueError(f'{ticker} no price history')
    rows = []
    for idx, value in frame['Close'].dropna().items():
        rows.append({'time': str(idx.date()), 'close': float(value)})
    return price_drawdown(rows, today)


def collect(now=None, fetcher=None, fallback=fallback_drawdown, output=None, http=None, pdf_to_text=None):
    """Run ingestion. fetcher may be injected for offline contract tests."""
    now = now or datetime.now(timezone.utc)
    today = now.date()
    fetcher = fetcher or fetch_text
    data = {key: None for key in FIELDS}
    sources, issues, integrations = {}, [], {}
    for name, decoder in (('macro-dashboard', macro_to_fields), ('kr-trade-monitor', kr_to_fields)):
        try:
            body, url = fetcher(name)
            fields, detail, field_errors, more = decoder(body, today)
            data.update(fields)
            sources.update({key: dict(info, feedUrl=url) for key, info in detail.items()})
            issues.extend(field_errors)
            integrations[name] = dict({'status': 'mapped', 'url': url}, **more)
        except Exception as error:
            integrations[name] = {'status': 'unavailable', 'url': URLS[name][0], 'issue': str(error)[:240]}
            issues.append(f'{name}: {str(error)[:200]}')
    # Use yfinance *only* for fields absent in upstream public feeds / documented fallbacks.
    for key, ticker in [('aiDraw', 'AIQ'), ('kospiDraw', '^KS11'), ('spDraw', '^GSPC'), ('goldDraw', 'GC=F')]:
        if valid_number(data.get(key)):
            continue
        try:
            value, day, latest, peak = fallback(ticker, today)
            data[key] = value
            sources[key] = {
                'provider': 'Yahoo Finance / yfinance', 'ticker': ticker, 'marketDate': day,
                'definition': 'Trailing 365-calendar-day highest closing price; index or ETF proxy; dividend-adjusted as provided',
                'currentClose': latest, 'peakClose': peak,
            }
        except Exception as error:
            issues.append(f'fallback {ticker}: {str(error)[:150]}')
    # v4.1 extra public sources: FactSet forward P/E, FRED fed target, WGC central bank gold.
    http = http or extra.http_get
    spx = sources.get('spDraw') or {}
    spx_day = iso_day(spx.get('marketDate'))
    jobs = [
        ('factset', lambda: extra.collect_factset(today, http, pdf_to_text or extra.pdf_text, spx.get('currentClose'), spx_day)),
        ('fred', lambda: extra.collect_fred(today, http)),
        ('wgc', lambda: extra.collect_wgc(today, http)),
    ]
    for name, job in jobs:
        try:
            fields, detail, field_errors, more = job()
            data.update(fields)
            sources.update(detail)
            issues.extend(f'{name}: {e}' for e in field_errors if name != 'factset')
            integrations[name] = dict({'status': 'mapped'}, **more)
        except Exception as error:
            integrations[name] = {'status': 'unavailable', 'issue': str(error)[:240]}
            issues.append(f'{name}: {str(error)[:200]}')
    # Still no substitution for KOSPI forward PER, private portfolio NAV, or next-year CAPEX guidance.
    status = 'partial' if sources else 'unavailable'
    result = {
        'updatedAt': now.isoformat(),
        'data': data,
        'meta': {
            'status': status, 'sources': sources, 'issues': issues,
            'integrations': integrations,
            'notes': [
                'S&P500 and gold futures are USD price histories (1-year closing high, not lifetime high).',
                'Gold futures contract rolls can affect the drawdown series.',
                'KR exports and fixed memory prices use the latest published upstream seed.js; local-only PDFs are not visible.',
                'Two-month memory decline requires both DDR5 and NAND to decline in BOTH months.',
                'S&P500 earnings yield = FactSet forward 12M EPS (report close / forward P/E) / latest S&P500 close.',
                'Fed pivot: cuts since last hike. 1 cut = watch only, 2+ cuts = pivot (FRED DFEDTARU).',
                'Central bank gold: latest WGC quarter vs. same quarter a year earlier.',
                'KOSPI forward PER, US rates rising and portfolio NAV remain manual; no invented values.',
                'No Telegram notifications and no investment transactions.',
            ],
        },
    }
    path = Path(output) if output else ROOT / 'data.json'
    path.write_text(json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False) + '\n', encoding='utf-8')
    print(f'Saved {len(sources)} auto-mapped fields; {len(issues)} issues; providers: '
          + ', '.join(f'{name}={status["status"]}' for name, status in integrations.items()))
    return result


if __name__ == '__main__':
    collect()
