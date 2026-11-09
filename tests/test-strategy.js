const assert=require('node:assert/strict');
const S=require('../assets/strategy.js');
const known=(r,asset,side)=>r.rules[asset][side+'Signal'];
let r=S.evaluate({spDraw:20,earningsYield:6,treasuryYield:3});
assert.equal(known(r,'sp','buy'),true);
assert.equal(known(r,'sp','sell'),false);
r=S.evaluate({spDraw:30,earningsYield:3.5,treasuryYield:3.2});
assert.equal(known(r,'sp','buy'),false);
assert.equal(known(r,'sp','sell'),true);
r=S.evaluate({aiDraw:31},[]);
assert.equal(known(r,'ai','buy'),null,'AI buy is unknown without four reviewed next-year guidance reports');
assert.equal(known(r,'ai','sell'),null,'No 2 cuts verified, but unknown is not false');
function doc(company,status,verified){return {company,period:'2026Q3',trend:'expanding',guidance:{status,verified,period:'next_year'}}}
let docs=[doc('Microsoft','cut',true),doc('Alphabet','cut',true)];
r=S.evaluate({},docs);assert.equal(known(r,'ai','sell'),true);
docs=[doc('Microsoft','increase',true),doc('Alphabet','maintain',true),doc('Amazon','increase',true),doc('Meta','maintain',true)];
r=S.evaluate({aiDraw:35},docs);assert.equal(known(r,'ai','buy'),true);
assert.equal(known(r,'ai','sell'),false);
r=S.evaluate({portfolioDraw:27});assert.deepEqual(r.stages.map(x=>x.passed),[true,true,false]);
r=S.evaluate({kospiDraw:25,kospiForwardPER:8,semiExportM1:14,semiExportM2:11,semiExportM3:8,semiExportM4:6,memoryPriceM1:-1,memoryPriceM2:-2});
assert.equal(known(r,'kr','buy'),true);assert.equal(known(r,'kr','sell'),true);
// Upstream reports: both DDR5 and NAND must fall twice. Boolean overrides an incomplete DDR5-only proxy.
r=S.evaluate({semiExportM1:14,semiExportM2:11,semiExportM3:8,semiExportM4:6,memoryPriceM1:-10,memoryPriceM2:-4,memoryTwoMonthDecline:false});
assert.equal(known(r,'kr','sell'),false,'positive NAND prevents semiconductor sell warning');
r=S.evaluate({semiExportM1:14,semiExportM2:11,semiExportM3:8,semiExportM4:6,memoryTwoMonthDecline:true});
assert.equal(known(r,'kr','sell'),true,'verified two-month joint memory decline triggers warning');
r=S.evaluate({goldDraw:25,cbBuyingMaintained:true});assert.equal(known(r,'gold','buy'),true);assert.equal(known(r,'gold','sell'),null);
// Fed rule: 1 cut = watch label only, 2 cuts = pivot satisfies the gold buy alternative.
r=S.evaluate({goldDraw:26,cbBuyingMaintained:false,fedCutPivot:false,fedCutCount:1});
assert.equal(known(r,'gold','buy'),false);assert.match(r.rules.gold.buy[1].label,/관심 단계/);
r=S.evaluate({goldDraw:26,cbBuyingMaintained:false,fedCutPivot:true,fedCutCount:2});
assert.equal(known(r,'gold','buy'),true);assert.doesNotMatch(r.rules.gold.buy[1].label,/관심 단계/);
// KOSPI forward PER as a manual range: upper <= 8 passes, lower > 8 fails, straddling 8 is unknown.
const NOW=new Date('2026-11-09T00:00:00');
r=S.evaluate({kospiDraw:44,kospiForwardPERLow:6.3,kospiForwardPERHigh:6.5,kospiPERAsOf:'2026-07-31'},[],{},NOW);
assert.equal(r.rules.kr.buy[1].passed,true);assert.equal(known(r,'kr','buy'),true);
assert.match(r.rules.kr.buy[1].label,/6\.3~6\.5배/);assert.match(r.rules.kr.buy[1].label,/갱신 권장/);
r=S.evaluate({kospiForwardPERLow:8.4,kospiForwardPERHigh:9},[],{},NOW);assert.equal(r.rules.kr.buy[1].passed,false);
r=S.evaluate({kospiForwardPERLow:7.5,kospiForwardPERHigh:8.5},[],{},NOW);assert.equal(r.rules.kr.buy[1].passed,null);
r=S.evaluate({kospiForwardPERHigh:6.5,kospiForwardPERLow:6.3,kospiPERAsOf:'2026-11-01'},[],{},NOW);assert.doesNotMatch(r.rules.kr.buy[1].label,/갱신 권장/);
r=S.evaluate({kospiForwardPER:7.9},[],{},NOW);assert.equal(r.rules.kr.buy[1].passed,true,'legacy single value still works');
assert.deepEqual(S.ASSETS.map(x=>x.id),['sp','ai','kr','gold','cash']);
console.log('Strategy tests: five asset rules and unknown-data safeguards passed');
