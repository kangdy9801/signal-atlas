"""Market snapshot for Signal Atlas GitHub Pages. No messaging/notifications.

Only carefully identified numeric data is mapped into strategy fields. Other data
sources are linked for research but never silently interpreted as a trade signal.
"""
from __future__ import annotations

import json
import math
import os
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parent
FIELDS=[
    'spDraw','earningsYield','treasuryYield','aiDraw','kospiDraw','kospiForwardPER',
    'semiExportM1','semiExportM2','semiExportM3','semiExportM4','memoryPriceM1','memoryPriceM2',
    'goldDraw','cbBuyingMaintained','fedCutPivot','usRatesRising','cbBuyingDeclining',
    'portfolioDraw'
]

# Read-only reference feeds. Not all fields are necessarily available or stable.
REFERENCE_FEEDS={
    'macro-dashboard': 'https://kangdy9801.github.io/macro-dashboard/data/market.json',
    'kr-trade-monitor': 'https://kangdy9801.github.io/kr-trade-monitor/assets/seed.js',
}

def drawdown(ticker):
    import yfinance as yf
    candles=yf.Ticker(ticker).history(period='1y',interval='1d',auto_adjust=True)
    if candles.empty or len(candles)<30:raise ValueError('not enough observations')
    closes=candles['Close'].dropna()
    latest,peak=float(closes.iloc[-1]),float(closes.max())
    if not all(map(math.isfinite,[latest,peak])) or peak<=0:raise ValueError('invalid price data')
    return round(max(0,(peak-latest)/peak*100),3),str(closes.index[-1].date())

def treasury_yield():
    import yfinance as yf
    hist=yf.Ticker('^TNX').history(period='10d',interval='1d')
    value=float(hist['Close'].dropna().iloc[-1])
    if not math.isfinite(value):raise ValueError('invalid treasury yield')
    return round(value,3),str(hist.index[-1].date())

def probe_reference_feeds():
    """Record reachable status only. No assumptions about unknown JSON/JS fields."""
    result={}
    for name,url in REFERENCE_FEEDS.items():
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'SignalAtlas/2 (+GitHub Pages research dashboard)'})
            with urllib.request.urlopen(req,timeout=12) as resp:
                sample=resp.read(768)
                ct=resp.headers.get('Content-Type','')
                if resp.status!=200 or not sample:raise ValueError('empty or unsuccessful response')
                result[name]={'status':'reachable','url':url,'contentType':ct,
                              'mapping':'reference only; field schema and publication date must be verified'}
        except Exception as err:
            result[name]={'status':'unavailable','url':url,'issue':str(err)[:170]}
    return result

def collect():
    data={key:None for key in FIELDS}
    sources={};issues=[]
    for key,ticker in [('spDraw','^GSPC'),('aiDraw','AIQ'),('kospiDraw','^KS11'),('goldDraw','GC=F')]:
        try:
            value,date=drawdown(ticker)
            data[key]=value
            sources[key]={'ticker':ticker,'marketDate':date,'definition':'max drawdown from closing-price high within last 1 year'}
        except Exception as e:issues.append(f'{key}: {ticker}: {str(e)[:120]}')
    try:
        value,date=treasury_yield()
        data['treasuryYield']=value
        sources['treasuryYield']={'ticker':'^TNX','marketDate':date,'definition':'US 10y Treasury yield (%)'}
    except Exception as e:issues.append(f'treasuryYield: {str(e)[:120]}')
    if not sources:raise RuntimeError('All market sources failed; previous snapshot retained')
    result={
        'updatedAt':datetime.now(timezone.utc).isoformat(),
        'data':data,
        'meta':{
            'status':'partial','sources':sources,'issues':issues,
            'integrations':probe_reference_feeds(),
            'notes':[
              '1-year closing-price high is not lifetime all-time high',
              'AIQ is an AI equity proxy; GC=F is USD gold futures, not Korean KRW gold spot',
              'Forward earnings yield, next-year CAPEX guidance and private portfolio weights are NOT inferred',
              'Reference feeds are connectivity checks, not unvalidated automatic trading inputs',
              'Public GitHub Pages cannot synchronise browser-private PDF uploads across devices'
            ]
        }
    }
    (ROOT/'data.json').write_text(json.dumps(result,ensure_ascii=False,indent=2,allow_nan=False)+'\n',encoding='utf-8')
    print(f'Saved {len(sources)} verified market inputs; {len(issues)} errors; no notifications')
    return result

if __name__=='__main__':collect()
