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
assert.deepEqual(S.ASSETS.map(x=>x.id),['sp','ai','kr','gold','cash']);
console.log('Strategy tests: five asset rules and unknown-data safeguards passed');
