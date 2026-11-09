/* Signal Atlas investment rules. 3-valued logic: true / false / null (unknown). */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SignalStrategy=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const COMPANY_KEYS=['Microsoft','Alphabet','Amazon','Meta'];
const DEFAULTS={spDraw:20,spSpreadBuy:2,spSpreadSell:0.5,aiDraw:30,capexCuts:2,kospiDraw:25,kospiPER:8,goldDraw:25,cash1:15,cash2:25,cash3:35};
const ASSETS=[
  {id:'sp',name:'미국 S&P 500',icon:'🇺🇸',sub:'주가 하락과 국채 대비 이익수익률을 함께 확인합니다.'},
  {id:'ai',name:'AI · 빅테크',icon:'✦',sub:'주가 30% 하락과 빅테크의 차기년도 AI 투자 계획을 분리해서 판단합니다.'},
  {id:'kr',name:'한국 커버드콜',icon:'🇰🇷',sub:'코스피 밸류에이션, 반도체 수출과 메모리 가격을 같이 봅니다.'},
  {id:'gold',name:'금',icon:'◈',sub:'원화 환산이 아닌 달러 금값·중앙은행 매입·미국 금리입니다.'},
  {id:'cash',name:'현금',icon:'▣',sub:'고평가 시 비축하고 자산 15·25·35% 하락에서 단계적으로 배분합니다.'}
];
const number=x=>typeof x==='number'&&Number.isFinite(x);
const boolean=x=>typeof x==='boolean'?x:null;
const ge=(x,y)=>number(x)?x>=y:null;
const gt=(x,y)=>number(x)?x>y:null;
const le=(x,y)=>number(x)?x<=y:null;
function and(...xs){if(xs.includes(false))return false;if(xs.every(x=>x===true))return true;return null;}
function or(...xs){if(xs.includes(true))return true;if(xs.every(x=>x===false))return false;return null;}
function item(label,passed){return {label,passed};}
function ratio(a,b){return number(a)&&number(b)&&b>0?(a/b-1)*100:null;}
function getLatestDocs(docs){
 const latest={};
 for(const company of COMPANY_KEYS){
  const matches=(Array.isArray(docs)?docs:[]).filter(d=>d.company===company&&d.period);
  matches.sort((a,b)=>(b.period||'').localeCompare(a.period||'')||(b.importedAt||'').localeCompare(a.importedAt||''));
  latest[company]=matches[0]||null;
 }
 return latest;
}
function capexSummary(docs){
 const latest=getLatestDocs(docs);let cuts=0,maintains=0,known=0;
 const rows=COMPANY_KEYS.map(company=>{
  const d=latest[company],g=d?.guidance;
  const verified=Boolean(g?.verified===true&&g?.period==='next_year');
  const status=verified&&['cut','maintain','increase'].includes(g.status)?g.status:'unknown';
  if(status!=='unknown')known++;
  if(status==='cut')cuts++;
  if(status==='maintain'||status==='increase')maintains++;
  return {company,doc:d,verified,status};
 });
 return {rows,cuts,maintains,known,missing:COMPANY_KEYS.length-known,
   // A 'maintained investment' signal requires reviewed, next-year guidance from ALL FOUR companies.
   maintained:known===4?cuts===0:null,
   cutsSignal:cuts>=2?true:known===4?false:null,
   positiveExecution:rows.filter(x=>x.doc?.trend==='expanding').length
 };
}
function evaluate(data={},docs=[],thresholds={},now=new Date()){
 const t={...DEFAULTS,...thresholds},d=data,capex=capexSummary(docs);
 const spread=number(d.earningsYield)&&number(d.treasuryYield)?d.earningsYield-d.treasuryYield:null;
 const ex=[d.semiExportM1,d.semiExportM2,d.semiExportM3,d.semiExportM4];
 const semislow=ex.every(number)?ex.slice(1).every((v,i)=>v<ex[i]):null;
 const memfall=typeof d.memoryTwoMonthDecline==='boolean'?d.memoryTwoMonthDecline:(number(d.memoryPriceM1)&&number(d.memoryPriceM2)?d.memoryPriceM1<0&&d.memoryPriceM2<0:null);
 const stages=[t.cash1,t.cash2,t.cash3].map((v,i)=>({level:i+1,draw:v,passed:ge(d.portfolioDraw,v)}));
 const rules={
  sp:{buy:[item(`고점 대비 ${t.spDraw}% 이상 하락`,ge(d.spDraw,t.spDraw)),item(`주식 예상 이익수익률 − 미국 국채 금리 ≥ ${t.spSpreadBuy}%p`,ge(spread,t.spSpreadBuy))],sell:[item(`이익수익률 − 국채금리 ≤ ${t.spSpreadSell}%p`,le(spread,t.spSpreadSell))]},
  ai:{buy:[item(`AI 주식 바스켓 고점 대비 ${t.aiDraw}% 이상 하락`,ge(d.aiDraw,t.aiDraw)),item(`4대 기업의 차기년도 AI·CAPEX 투자 유지 확인`,capex.maintained)],sell:[item(`4대 기업 중 ${t.capexCuts}곳 이상 차기년도 CAPEX 축소 확인 (검증 완료 ${capex.cuts}곳)`,capex.cuts>=t.capexCuts?true:capex.known===4?false:null)]},
  kr:{buy:[item(`코스피 고점 대비 ${t.kospiDraw}% 이상 하락`,ge(d.kospiDraw,t.kospiDraw)),item(`코스피 예상 PER ≤ ${t.kospiPER}배`,le(d.kospiForwardPER,t.kospiPER))],sell:[item('반도체 수출 증가율 3회 연속 둔화',semislow),item('DDR5·NAND 가격 각각 2개월 연속 하락 (공개 보도자료 기준)',memfall)]},
  gold:{buy:[item(`달러 금값 고점 대비 ${t.goldDraw}% 이상 하락`,ge(d.goldDraw,t.goldDraw)),item('중앙은행 매입 유지 또는 미국 금리 인하 전환',or(boolean(d.cbBuyingMaintained),boolean(d.fedCutPivot)))],sell:[item('미국 금리 지속 상승',boolean(d.usRatesRising)),item('중앙은행 금 매입 감소',boolean(d.cbBuyingDeclining))]},
  cash:{buy:[item(`투자자산 전체 고점 대비 ${t.cash1}% 이상 하락 (1차 현금 투입 검토)`,ge(d.portfolioDraw,t.cash1))],sell:[item(`이익수익률 − 국채금리 ≤ ${t.spSpreadSell}%p (현금 확보 검토)`,le(spread,t.spSpreadSell))]}
 };
 const result={};for(const asset of ASSETS){const x=rules[asset.id];result[asset.id]={...x,buySignal:and(...x.buy.map(v=>v.passed)),sellSignal:and(...x.sell.map(v=>v.passed))};}
 return {rules:result,spread,capex,stages,thresholds:t};
}
return {COMPANY_KEYS,DEFAULTS,ASSETS,evaluate,capexSummary,getLatestDocs,and,or,ratio};
});
