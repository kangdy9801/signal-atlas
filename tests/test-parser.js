const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const P=require('../assets/pdf-analyzer.js');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'alphabet-pdf-rows.json'),'utf8'));
const rec=P.parseReport(fixture,'2026q3-alphabet-earnings-release.pdf');
assert.equal(rec.company,'Alphabet');
assert.equal(rec.period,'2026Q3');
assert.equal(rec.quarterCapexM,51355);
assert.equal(rec.previousYearCapexM,23953);
assert.equal(rec.ttmCapexM,159804);
assert.equal(rec.quarterHistory.length,4);
assert.equal(rec.quarterHistory[0].period,'2025Q4');
assert.equal(rec.quarterHistory[3].capexM,51355);
assert.ok(Math.abs(rec.yoy-114.399)<0.01);
assert.ok(Math.abs(rec.qoq-14.315)<0.01);
assert.equal(rec.guidance.status,'unknown','Do not invent forward CAPEX guidance');
assert.equal(rec.confidence,'high');
assert.ok(rec.evidence.some(x=>x.page===6));
assert.ok(rec.evidence.some(x=>x.page===8));
const future=P.parseReport([{page:1,lines:[
 'Microsoft Corporation Announces First Quarter 2026 Results',
 'We expect to reduce capital expenditures in next year 2027 by 10 percent.',
 'Purchases of property and equipment 30,000 25,000 60,000 50,000',
 ]}], 'microsoft.pdf');
assert.equal(future.company,'Microsoft');
assert.equal(future.guidance.status,'cut');
assert.equal(future.guidance.verified,false,'PDF text may not self-verify next-year guidance');
const safe=P.parseReport([{page:1,lines:['Meta Platforms Announces Third Quarter 2026 Results','Net income 1234','We invested in AI infrastructure.']}],'meta.pdf');
assert.equal(safe.quarterCapexM,null,'Never make up CAPEX amount');
assert.equal(safe.confidence,'review');
console.log('PDF parser tests: 17 assertions passed; Alphabet cash-flow figures verified');
