"""Offline fixture test; no network calls or third-party API are required."""
import json
import sys
import tempfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import collect

def fake_draw(ticker):
    return {'^GSPC': (21.0,'2026-11-06'), 'AIQ': (31.0,'2026-11-06'), '^KS11':(25.5,'2026-11-09'), 'GC=F':(4.0,'2026-11-06')}[ticker]

old_root=collect.ROOT
old_draw=collect.drawdown
old_treasury=collect.treasury_yield
old_probe=collect.probe_reference_feeds
with tempfile.TemporaryDirectory() as d:
    try:
        collect.ROOT=Path(d)
        collect.drawdown=fake_draw
        collect.treasury_yield=lambda:(3.7,'2026-11-06')
        collect.probe_reference_feeds=lambda:{'macro-dashboard':{'status':'reachable'}, 'kr-trade-monitor':{'status':'reachable'}}
        result=collect.collect()
        assert json.loads((Path(d)/'data.json').read_text())==result
        assert result['data']['spDraw']==21.0
        assert result['data']['aiDraw']==31.0
        assert result['data']['kospiDraw']==25.5
        assert result['data']['goldDraw']==4.0
        assert result['data']['treasuryYield']==3.7
        assert result['data']['earningsYield'] is None
        assert result['data']['kospiForwardPER'] is None
        assert result['data']['semiExportM1'] is None
        assert result['data']['cbBuyingMaintained'] is None
        assert not any(k.startswith('crypto') for k in result['data'])
        assert len(result['meta']['sources'])==5
    finally:
        collect.ROOT=old_root
        collect.drawdown=old_draw
        collect.treasury_yield=old_treasury
        collect.probe_reference_feeds=old_probe
print('Market collector contract test passed: 5 market fields and null-safe unmapped research fields')
