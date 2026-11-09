"""Offline tests for v4.1 sources. Fixtures copy the sentence shapes of the real publications."""
import json
import sys
import tempfile
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import collect
import collect_extra as x

TODAY = date(2026, 11, 9)

# ---------- FactSet: forward P/E + report close -> implied EPS -> daily yield
FACTSET_TEXT = """Key Metrics • Valuation: The forward 12-month P/E ratio for the S&P 500 is 18.7. This P/E ratio is below
the 5-year average (19.8). Targets & Ratings: The bottom-up target price for the S&P 500 is 9,327.80, which is 20.8% above
the closing price of 7,720.39."""
value, detail = x.factset_to_fields(FACTSET_TEXT, date(2026, 10, 30), 'u', 7376.86, date(2026, 11, 6))
assert abs(detail['impliedForwardEPS'] - 412.86) < 0.01, detail
assert value == 5.597, value                      # 412.86 / 7376.86
value, detail = x.factset_to_fields(FACTSET_TEXT, date(2026, 10, 30), 'u')  # no SPX close -> 100/PE
assert value == 5.348 and 'weekly' in detail['definition']
try: x.factset_to_fields('no valuation sentence', TODAY, 'u')
except ValueError: pass
else: raise AssertionError('missing P/E accepted')
days = [d for d, _ in x.factset_candidates(TODAY)]
assert days[0] == date(2026, 11, 6) and all(d.weekday() in (3, 4) for d in days) and min(days) >= TODAY - timedelta(days=14)
assert 'EarningsInsight_110626.pdf' in next(x.factset_candidates(TODAY))[1]

# ---------- FRED: 1 cut since last hike = watch, 2 cuts = pivot
def fred_csv(path):
    start, rows, level = date(2026, 1, 1), ['observation_date,DFEDTARU'], 4.00
    for i in range(300):
        day = start + timedelta(days=i)
        level = path.get(i, level)
        rows.append(f'{day.isoformat()},{level:.2f}')
    rows.append(f'{(start + timedelta(days=300)).isoformat()},.')  # FRED missing marker
    return '\n'.join(rows)
today = date(2026, 1, 1) + timedelta(days=302)
v, _ = x.fed_from_csv(fred_csv({50: 4.25, 120: 4.00}), today)            # hike then one cut
assert v == {'fedCutPivot': False, 'fedCutCount': 1}, v
v, d = x.fed_from_csv(fred_csv({50: 4.25, 120: 4.00, 200: 3.75}), today)  # hike then two cuts
assert v == {'fedCutPivot': True, 'fedCutCount': 2} and d['fedCutPivot']['stage'] == 'pivot'
v, _ = x.fed_from_csv(fred_csv({50: 3.75, 120: 3.50, 200: 3.75}), today)  # cuts reset by a new hike
assert v == {'fedCutPivot': False, 'fedCutCount': 0}, v
try: x.fed_from_csv(fred_csv({}), today + timedelta(days=60))
except ValueError: pass
else: raise AssertionError('stale FRED accepted')

# ---------- WGC: real sentence shapes, latest quarter vs year-ago quarter
assert x.wgc_tonnes(x.html_to_text('<p>Central bank demand remained strong in Q3, with net purchases of 321t – above</p>')) == 321
assert x.wgc_tonnes('Net purchases totalled a healthy 289t in Q2; H1 demand was the lowest') == 289
assert x.wgc_tonnes('Q3 central bank net purchases of 186t lift y-t-d buying to 694t') == 186
assert x.wgc_tonnes('Global official gold reserves rose by a net 290t, the highest Q1') == 290
assert x.completed_quarters(TODAY) == [(3, 2026), (2, 2026)]
assert x.completed_quarters(date(2027, 2, 1)) == [(4, 2026), (3, 2026)]
assert x.quarter_end(4, 2026) == date(2026, 12, 31)
pages = {x.WGC_URL.format(q=3, y=2026): b'<p>with net purchases of 321t above</p>',
         x.WGC_URL.format(q=3, y=2025): b'<p>with net purchases of 220t in Q3</p>'}
def wgc_get(url, max_bytes=None):
    if url in pages: return pages[url]
    raise RuntimeError('404')
v, d, _, meta = x.collect_wgc(TODAY, wgc_get)
assert v == {'cbBuyingMaintained': True, 'cbBuyingDeclining': False} and meta['reportMonth'] == '2026-Q3'
pages[x.WGC_URL.format(q=3, y=2025)] = b'<p>with net purchases of 337t in Q3</p>'
v, *_ = x.collect_wgc(TODAY, wgc_get)
assert v == {'cbBuyingMaintained': False, 'cbBuyingDeclining': True}, v

# ---------- End to end: all three merged into data.json; SPX close comes from the macro feed
macro = json.dumps({'series': [
    {'id': 'spx', 'data': [{'time': (TODAY - timedelta(days=60 - i)).isoformat(), 'close': 7500.0 if i < 57 else 7376.86} for i in range(58)]},
    {'id': 'us10y', 'data': [{'time': (TODAY - timedelta(days=3)).isoformat(), 'value': 4.86}]},
]})
def http(url, max_bytes=None):
    if 'EarningsInsight_110626' in url: return FACTSET_TEXT.encode()
    if 'fredgraph' in url:
        lines = ['observation_date,DFEDTARU'] + [f'{(TODAY - timedelta(days=200 - i)).isoformat()},{4.25 if i < 100 else 4.00 if i < 150 else 3.75}' for i in range(199)]
        return '\n'.join(lines).encode()
    return wgc_get(url)
with tempfile.TemporaryDirectory() as tmp:
    result = collect.collect(now=datetime(2026, 11, 9, 4, tzinfo=timezone.utc),
                             fetcher=lambda name: (macro, 'm') if name == 'macro-dashboard' else (_ for _ in ()).throw(RuntimeError('kr off')),
                             fallback=lambda t, d: (_ for _ in ()).throw(RuntimeError('off')),
                             output=Path(tmp) / 'data.json', http=http, pdf_to_text=lambda b: b.decode())
data = result['data']
assert data['earningsYield'] == round(7720.39 / 18.7 / 7376.86 * 100, 3), data['earningsYield']
assert data['fedCutPivot'] is True and data['fedCutCount'] == 2
assert data['cbBuyingDeclining'] is True and data['kospiForwardPER'] is None and data['usRatesRising'] is None
for name in ('factset', 'fred', 'wgc'):
    assert result['meta']['integrations'][name]['status'] == 'mapped', result['meta']['integrations']

print('Extra source tests passed: FactSet forward P/E, FRED 1-cut watch / 2-cut pivot, WGC year-over-year')
