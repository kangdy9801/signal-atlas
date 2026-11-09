"""Deterministic offline contract tests for the two connected repositories."""
import json
import sys
import tempfile
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import collect

TODAY = date(2026, 11, 9)
NOW = datetime(2026, 11, 9, 4, 0, tzinfo=timezone.utc)


def daily_prices(days=80, first=100., last=70.):
    start = TODAY - timedelta(days=days+3)
    return [{'time': (start + timedelta(days=i)).isoformat(),
             'close': first if i < days-1 else last} for i in range(days)]


def daily_yields(days=80):
    start = TODAY - timedelta(days=days+3)
    return [{'time': (start + timedelta(days=i)).isoformat(), 'value': 3.4} for i in range(days)]


macro = json.dumps({'updated': '2026-11-09T01:00:00Z', 'series': [
    {'id':'spx','source':'Yahoo ^GSPC','data':daily_prices()},
    {'id':'gold','source':'Yahoo GC=F','data':daily_prices(first=120.,last=90.)},
    {'id':'us10y','source':'Treasury 10 Yr','data':daily_yields()},
]}, ensure_ascii=False)
kr_record = {'id':'202610', 'trade':{
    'year':2026, 'month':10,
    'items':{'반도체':{'yoy':[10,12,19,22,27,31,33,32,30,29,27,24,21]}},
    'memory':{'labels':['Aug','Sep','Oct'], 'ddr5':[10.,9.,8.], 'nand':[7.,6.5,5.8]},
}, 'industry':{'year':2026,'month':9}}
kr_source = '/* published seed */\nwindow.KTM_SEED = '+json.dumps([kr_record],ensure_ascii=False)+';'

fields, sources, issues, meta=collect.macro_to_fields(macro,TODAY)
assert fields['spDraw']==30.0, fields
assert fields['goldDraw']==25.0, fields
assert fields['treasuryYield']==3.4, fields
assert not issues, issues
assert meta['mappedFields']==['goldDraw','spDraw','treasuryYield']

fields, sources, issues, meta=collect.kr_to_fields(kr_source,TODAY)
assert [fields[f'semiExportM{i}'] for i in (1,2,3,4)]==[29,27,24,21], fields
assert fields['memoryTwoMonthDecline'] is True, fields
assert fields['memoryPriceM1']==-10 and fields['memoryPriceM2']==-11.111, fields
assert not issues, issues
assert meta['reportMonth']=='2026-10'

# Do not allow unsafe eval, stale observations, or look-ahead.
try:collect.seed_records_from_js('window.KTM_SEED = alert("hack");')
except ValueError:pass
else:raise AssertionError('arbitrary JS was accepted')
try:collect.kr_to_fields(kr_source,date(2027,3,1))
except ValueError:pass
else:raise AssertionError('stale monthly report accepted')
try:collect.macro_to_fields(macro,date(2027,3,1))
except ValueError:pass
else:raise AssertionError('stale daily observations accepted')

# A memory-price rally in either memory product invalidates the joint fall signal.
kr_bad=json.loads(json.dumps(kr_record))
kr_bad['trade']['memory']['nand']=[7,6.5,6.7]
fields,_,_,_=collect.kr_to_fields('window.KTM_SEED = '+json.dumps([kr_bad])+';',TODAY)
assert fields['memoryTwoMonthDecline'] is False

def offline(url, max_bytes=None):raise RuntimeError('offline test')

# Full end-to-end data merge into data.json without network; unprovided fields remain null.
with tempfile.TemporaryDirectory() as d:
    def fetcher(name):return (macro,'macro-data') if name=='macro-dashboard' else (kr_source,'kr-data')
    def fallback(ticker,today):return (31.0,TODAY.isoformat(),68,100) if ticker=='AIQ' else (26.0,TODAY.isoformat(),74,100)
    result=collect.collect(now=NOW,fetcher=fetcher,fallback=fallback,output=Path(d)/'data.json',http=offline)
    data=result['data']
    assert data['spDraw']==30 and data['goldDraw']==25 and data['treasuryYield']==3.4
    assert data['aiDraw']==31 and data['kospiDraw']==26
    assert data['semiExportM4']==21 and data['memoryTwoMonthDecline'] is True
    for never_invent in ['earningsYield','kospiForwardPER','cbBuyingMaintained','fedCutPivot','portfolioDraw']:
        assert data[never_invent] is None, (never_invent,data[never_invent])
    assert result['meta']['integrations']['macro-dashboard']['status']=='mapped'
    assert result['meta']['integrations']['kr-trade-monitor']['status']=='mapped'
    assert json.loads((Path(d)/'data.json').read_text())==result

# Both remote feeds can fail; output must be explicit unknown, not last month's stale numbers.
with tempfile.TemporaryDirectory() as d:
    def failing(name):raise RuntimeError('upstream unavailable')
    def failfallback(ticker,today):raise RuntimeError('market unavailable')
    result=collect.collect(now=NOW,fetcher=failing,fallback=failfallback,output=Path(d)/'data.json',http=offline)
    assert result['meta']['status']=='unavailable'
    assert all(value is None for value in result['data'].values())

print('Collector integration contract tests passed: macro JSON + KTM_SEED + staleness + cross-source rules')
