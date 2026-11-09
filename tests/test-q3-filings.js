const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const P=require('../assets/pdf-analyzer.js');
const S=require('../assets/strategy.js');
function fixture(name){return JSON.parse(fs.readFileSync(path.join(__dirname,`${name}-pdf-rows.json`),'utf8'));}
const alphabet=P.parseReport(fixture('alphabet'),'2026q3-alphabet-earnings-release(1).pdf');
assert.equal(alphabet.company,'Alphabet');assert.equal(alphabet.period,'2026Q3');assert.equal(alphabet.quarterCapexM,51355);
assert.equal(alphabet.previousYearCapexM,23953);assert.equal(alphabet.ttmCapexM,159804);
assert.equal(alphabet.quarterHistory.length,4);assert.equal(alphabet.currentYearGuidance,null);
const meta=P.parseReport(fixture('meta'),'Meta-Reports-Third-Quarter-2026-Results-2026.pdf');
assert.equal(meta.company,'Meta');assert.equal(meta.period,'2026Q3');assert.equal(meta.quarterCapexM,34906);
assert.equal(meta.previousYearCapexM,19374);assert.equal(meta.additional.leasePrincipalCurrentM,964);
assert.equal(meta.additional.cashPurchasesCurrentM,33942);assert.equal(meta.currentYearGuidance.lowB,135);
assert.equal(meta.currentYearGuidance.highB,145);assert.equal(meta.forwardOutlook.type,'qualitative_support');
assert.equal(meta.guidance.status,'unknown');
const amazon=P.parseReport(fixture('amazon'),'AMZN-Q3-2026-Earnings-Release.pdf');
assert.equal(amazon.company,'Amazon');assert.equal(amazon.period,'2026Q3');assert.equal(amazon.quarterCapexM,77259);
assert.equal(amazon.previousYearCapexM,35095);assert.equal(amazon.ttmCapexM,215192);
assert.equal(amazon.additional.cashNetCapexM,75878);assert.equal(amazon.currentYearGuidance.approxB,220);
assert.equal(amazon.currentYearGuidance.year,2026);assert.equal(amazon.guidance.status,'unknown');
for(const d of [alphabet,meta,amazon]){assert.ok(d.yoy>75);assert.equal(d.trend,'expanding');assert.equal(d.confidence,'high');assert.equal(d.guidance.verified,false);assert.ok(d.evidence.length>1);}
const ctx={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/seed-filings-2026q3.js'),'utf8'),ctx);
const seeds=ctx.window.SIGNAL_ATLAS_FILINGS_SEED;
assert.equal(seeds.length,3);assert.equal(new Set(seeds.map(d=>d.company+'_'+d.period)).size,3);
for(const d of seeds){assert.equal(d.quarterCapexM,({Alphabet:51355,Meta:34906,Amazon:77259})[d.company]);}
const v=S.evaluate({},seeds);
assert.equal(v.capex.positiveExecution,3);assert.equal(v.capex.cuts,0);
assert.equal(v.capex.maintained,null,'Three expansion actuals are not four verified next-year promises');
assert.equal(v.rules.ai.buySignal,null);assert.equal(v.rules.ai.sellSignal,null);
const cutDocs=seeds.map(d=>({...d,guidance:{...d.guidance}}));
for(const company of ['Meta','Amazon']){
  cutDocs.find(d=>d.company===company).guidance={status:'cut',period:'next_year',verified:true,text:'explicit cut next year',page:3};
}
const w=S.evaluate({},cutDocs);assert.equal(w.capex.cuts,2);assert.equal(w.rules.ai.sellSignal,true);
console.log('Q3 2026 3-company actual-PDF regression tests passed (numbers, units, forward-year safeguards, sell rule).');
