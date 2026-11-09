/* Signal Atlas UI — static GitHub Pages, local PDF analysis, no Telegram. */
(function(){
'use strict';
const P=globalThis.SignalPdfAnalyzer,S=globalThis.SignalStrategy;
if(!P||!S){document.body.insertAdjacentHTML('afterbegin','<p style="padding:20px;background:#fff4df;color:#764b15">Signal Atlas 스크립트를 불러오지 못했습니다. 파일 구조를 확인하세요.</p>');return;}
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const n=x=>typeof x==='number'&&Number.isFinite(x);
const fmt=(x,dec=1)=>n(x)?x.toLocaleString('ko-KR',{maximumFractionDigits:dec,minimumFractionDigits:dec}):'—';
const b=x=>n(x)?'$'+fmt(x/1000,2)+'B':'—';
const pct=x=>n(x)?(x>0?'+':'')+fmt(x,1)+'%':'—';
const dateText=ts=>ts?new Date(ts).toLocaleString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'미확인';
const STORE='signal-atlas-capex-v2.1';
const GROUPS=[
 {name:'① 미국 S&P500',desc:'S&P500 낙폭 + 국채 대비 예상 이익수익률',items:[['spDraw','S&P500 고점 대비 하락률 (%)','number','20'],['earningsYield','S&P500 예상 이익수익률 (%)','number','6'],['treasuryYield','미국 국채 10년물 금리 (%)','number','3']]},
 {name:'② AI 관련 주식',desc:'낙폭은 시세, 투자 유지·축소는 기업 PDF 기록에서 자동 계산',items:[['aiDraw','AI 주식 바스켓 고점 대비 하락률 (%)','number','30']]},
 {name:'③ 한국 커버드콜',desc:'커버드콜은 상승이 제한될 수 있고 하락 손실이 가능합니다.',items:[['kospiDraw','코스피 고점 대비 하락률 (%)','number','25'],['kospiForwardPER','코스피 예상 PER (배)','number','8'],['semiExportM1','반도체 수출 증가율: 3개월 전 (%)','number','15'],['semiExportM2','반도체 수출 증가율: 2개월 전 (%)','number','12'],['semiExportM3','반도체 수출 증가율: 1개월 전 (%)','number','8'],['semiExportM4','반도체 수출 증가율: 최신 월 (%)','number','4'],['memoryPriceM1','메모리 가격 변화율: 전월 (%)','number','-2'],['memoryPriceM2','메모리 가격 변화율: 최신 월 (%)','number','-3']]},
 {name:'④ 금',desc:'원·달러 환율 효과를 제거하기 위해 달러 기준 금값을 사용합니다.',items:[['goldDraw','달러 금값 고점 대비 하락률 (%)','number','25'],['cbBuyingMaintained','중앙은행 금 매입 유지','bool'],['fedCutPivot','미국 금리 인하 전환','bool'],['usRatesRising','미국 금리 연속 상승','bool'],['cbBuyingDeclining','중앙은행 금 매입 감소','bool']]},
 {name:'⑥ 현금',desc:'주식이 비싸면 비중을 높이고 15·25·35% 하락 때 분할 투입',items:[['portfolioDraw','전체 투자자산 고점 대비 하락률 (%)','number','15']]}
];
const TH_GROUP=[['spDraw','S&P500 매수 낙폭 (%)'],['spSpreadBuy','S&P500 매수 스프레드 (%p)'],['spSpreadSell','현금 확대·S&P 매도 스프레드 (%p)'],['aiDraw','AI 매수 낙폭 (%)'],['capexCuts','차기년도 CAPEX 축소 기준 기업 수'],['kospiDraw','코스피 매수 낙폭 (%)'],['kospiPER','코스피 예상 PER 상한 (배)'],['goldDraw','달러 금 매수 낙폭 (%)'],['cash1','현금 1차 투입 하락률 (%)'],['cash2','현금 2차 투입 하락률 (%)'],['cash3','현금 3차 투입 하락률 (%)']];
let state={manual:{},docs:[],thresholds:{...S.DEFAULTS},lastMarket:null,seedLoaded:false,seedVersion:null};
try{const prev=JSON.parse(localStorage.getItem(STORE)||'null');if(prev&&typeof prev==='object'){
 state={...state,manual:prev.manual&&typeof prev.manual==='object'?prev.manual:{},docs:Array.isArray(prev.docs)?prev.docs:[],thresholds:{...S.DEFAULTS,...(prev.thresholds||{})},lastMarket:prev.lastMarket||null,seedLoaded:prev.seedLoaded===true,seedVersion:prev.seedVersion||null};
}}catch(e){console.warn('Local storage unreadable',e)}
// Seed migration: carry forward manual inputs and user-verified documents, while adding
// the new Meta/Amazon Q3 2026 PDF analyses. Same company+quarter never counts twice.
const SEED_VERSION=globalThis.SIGNAL_ATLAS_FILINGS_VERSION||'q3-2026-three-filings-v1';
if(state.seedVersion!==SEED_VERSION){
 const seeds=Array.isArray(globalThis.SIGNAL_ATLAS_FILINGS_SEED)?globalThis.SIGNAL_ATLAS_FILINGS_SEED:[];
 for(const seed of seeds){
   const i=state.docs.findIndex(d=>d.company===seed.company&&d.period===seed.period);
   if(i<0)state.docs.push({...seed});
   else if(state.docs[i].seed===true)state.docs[i]={...seed};
 }
 state.seedVersion=SEED_VERSION;state.seedLoaded=true;
 try{localStorage.setItem(STORE,JSON.stringify(state))}catch{}
}
let view='dashboard',selectedId=state.docs[0]?.id||null,selectedChartCompany='Alphabet',market={data:{},updatedAt:null,meta:{status:'not_loaded',sources:{},issues:[]}};
if(state.lastMarket&&state.lastMarket.data)market=state.lastMarket;
const getInputs=()=>({...market.data,...state.manual});
const evalAll=()=>S.evaluate(getInputs(),state.docs,state.thresholds);
const save=()=>{try{localStorage.setItem(STORE,JSON.stringify(state));return true}catch(e){toast('저장 공간이 부족하거나 차단됐습니다. JSON 백업을 이용하세요.');console.error(e);return false}};
let toastTimer=null;function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),4700)}
function changeView(name){view=name;document.querySelectorAll('.view').forEach(el=>el.classList.toggle('hidden',el.id!==name+'View'));
 document.querySelectorAll('.nav button').forEach(el=>el.classList.toggle('active',el.dataset.view===name));
 $('crumbTitle').textContent=({dashboard:'OVERVIEW',ai:'AI & CAPEX',inputs:'INDICATORS',rules:'STRATEGY',settings:'SOURCES'})[name]||'OVERVIEW';
 if(name==='inputs')renderInputs();if(name==='ai')renderAi();if(name==='rules')renderRules();if(name==='settings')renderSettings();window.scrollTo({top:0,behavior:'smooth'});
}
function verdict(status){return status===true?['충족','buy']:status===false?['미충족','none']:['판단 보류','neutral']}
function sideStatus(buy,sell){if(sell===true)return ['축소·경계 검토','sell'];if(buy===true)return ['매수 검토 신호','buy'];if(buy===null||sell===null)return ['판단 보류','neutral'];return ['관망','neutral']}
function condList(items){return `<ul class="signal-conditions">${items.map(x=>`<li><span class="cond-dot ${x.passed===true?'ok':x.passed===false?'no':''}"></span>${esc(x.label)} <b style="margin-left:auto;color:${x.passed===true?'#15936d':x.passed===false?'#9ba8b6':'#b58339'};white-space:nowrap">${x.passed===true?'충족':x.passed===false?'미충족':'미확인'}</b></li>`).join('')}</ul>`}
function renderDashboard(){
 const r=evalAll(),statuses=S.ASSETS.map(a=>r.rules[a.id]);
 $('buyCount').textContent=statuses.filter(x=>x.buySignal===true).length;
 $('sellCount').textContent=statuses.filter(x=>x.sellSignal===true).length;
 $('unknownCount').textContent=statuses.filter(x=>x.buySignal===null||x.sellSignal===null).length;
 $('docCount').textContent=state.docs.length;$('navDocCount').textContent=state.docs.length;
 $('marketTimeTop').textContent=market.updatedAt?'시세 스냅샷 '+new Date(market.updatedAt).toLocaleDateString('ko-KR'):'자동 시세 미연결';
 $('sourceNotice').querySelector('span:last-child').textContent=market.updatedAt?'자동 시장 데이터와 수동 입력을 조합합니다. '+dateText(market.updatedAt)+' 수집 기준이며, 데이터 종류·가격 고점 기준·결측치를 반드시 확인하세요.':'시장 자동 수집 데이터가 아직 없습니다. 지표 입력에서 직접 기록하거나 GitHub Actions를 배포하세요. 기업 PDF 분석은 별도로 가능합니다.';
 $('assetGrid').innerHTML=S.ASSETS.map(a=>{
 const v=r.rules[a.id],[text,cls]=sideStatus(v.buySignal,v.sellSignal);
 let extra='';
 if(a.id==='ai')extra=`기업 실적집행 확대 ${r.capex.positiveExecution}곳 · 다음 회계연도 축소 확인 ${r.capex.cuts}/4곳`;
 if(a.id==='cash')extra=r.stages.map(x=>`${x.level}차(${x.draw}%): ${x.passed===true?'도달':x.passed===false?'미도달':'미확인'}`).join(' · ');
 if(a.id==='kr')extra='커버드콜은 상승 이익이 제한될 수 있고 하락 손실도 발생합니다.';
 if(a.id==='gold')extra='원화 시세 대신 달러 기준 금 가격을 사용합니다.';
 if(a.id==='sp'&&n(r.spread))extra=`예상 이익수익률 − 국채금리 = ${fmt(r.spread,2)}%p`;
 return `<article class="asset"><div class="asset-head"><div class="asset-name"><span class="aicon">${a.icon}</span>${esc(a.name)}</div><span class="status ${cls}">${text}</span></div><p class="asset-summary">${esc(a.sub)}</p><div class="asset-detail"><div class="signal-title">${a.id==='cash'?'단계적 현금 투입':'매수 검토'}<span class="pill">${verdict(v.buySignal)[0]}</span></div>${condList(v.buy)}<div class="signal-title">${a.id==='cash'?'현금 확보':'매도·축소 검토'}<span class="pill">${verdict(v.sellSignal)[0]}</span></div>${condList(v.sell)}</div>${extra?`<div class="asset-tip">${esc(extra)}</div>`:''}</article>`;
 }).join('');
 $('overviewCapex').innerHTML=r.capex.rows.map(x=>{
 const doc=x.doc;let sub=doc?`${doc.period} · ${b(doc.quarterCapexM)}`:'분석 기록 없음';let stance=doc?(doc.trend==='expanding'?'실제 지출 확대':doc.trend==='contracting'?'실제 지출 감소':'추세 미확인'):'PDF 필요';
 return `<div class="mini-company"><strong>${esc(x.company)}</strong><div class="desc">${esc(sub)}</div><span class="small-status ${doc?.trend==='expanding'?'up':doc?.trend==='contracting'?'down':''}">${esc(stance)}</span></div>`;
 }).join('')+`<p class="muted-text">※ 실제 CAPEX 증가는 다음 해 투자 계획의 '유지 확정'과 다릅니다.</p>`;
 $('overviewFeeds').innerHTML=`<div class="feed-line"><div><strong>시장 자동 수집</strong><small>GitHub Actions · yfinance</small></div><span class="tag">${market.updatedAt?'마지막 갱신 '+new Date(market.updatedAt).toLocaleDateString('ko-KR'):'미연결'}</span></div><div class="feed-line"><div><strong>Macro Dashboard</strong><small>관련 지수·금리·금 등</small></div><span class="tag">외부 참고</span></div><div class="feed-line"><div><strong>KR Trade Monitor</strong><small>반도체 수출·메모리 가격</small></div><span class="tag">필드 검증 필요</span></div><div class="feed-line"><div><strong>기업 IR PDF</strong><small>브라우저 분석 기록</small></div><span class="tag">${state.docs.length}건</span></div>`;
 $('sidebarUpdated').textContent=market.updatedAt?'자동 시세 기준 '+dateText(market.updatedAt):'자동 시세: 아직 연결되지 않음';
}
function companyAbbr(key){return ({Alphabet:'G',Microsoft:'M',Amazon:'A',Meta:'M'})[key]||'?';}
function companyCard(row){
 const d=row.doc;
 if(!d)return `<div class="company-card"><div class="company-top"><span class="company-logo">${companyAbbr(row.company)}</span><span class="status neutral">PDF 없음</span></div><strong>${esc(row.company)}</strong><p>실적 보고서 업로드 필요</p><div class="big-number">—</div><div class="delta">CAPEX 추세 미확인</div><div class="company-footer"><span>다음 해 투자 가이던스</span><b>미확인</b></div></div>`;
 const trend=d.trend==='expanding'?'실제 투자 확대':d.trend==='contracting'?'실제 투자 감소':'추세 확인 필요';
 const next=row.status==='cut'?'다음 해 축소 확인':row.status==='increase'?'다음 해 확대 확인':row.status==='maintain'?'다음 해 유지 확인':'다음 해 계획 미확인';
 return `<div class="company-card"><div class="company-top"><span class="company-logo">${companyAbbr(row.company)}</span><span class="pill">${esc(d.period)}</span></div><strong>${esc(row.company)}</strong><p>${esc(d.capexDefinitionLabel||'전체 유형자산 취득액')}</p><div class="big-number">${b(d.quarterCapexM)}</div><div class="delta ${d.trend==='expanding'?'up':d.trend==='contracting'?'down':''}">${esc(trend)} · YoY ${pct(d.yoy)}</div><div class="company-footer"><span>${esc(next)}</span><button type="button" class="link-action" data-doc-id="${esc(d.id)}">상세 ↗</button></div></div>`;
}
function renderAi(){
 const r=evalAll(),c=r.capex;
 const reported=c.rows.filter(x=>x.doc).length;
 $('coverageCount').textContent=`${reported} / 4`;$('positiveCount').textContent=c.positiveExecution;$('cutCount').textContent=`${c.cuts} / 4`;$('maintainCount').textContent=`${c.maintains} / 4`;
 const headline=$('aiNarrativeTitle'),desc=$('aiNarrativeDesc'),badge=$('aiHeadlineBadge');
 if(c.cuts>=state.thresholds.capexCuts){headline.textContent='차기년도 CAPEX 축소 경고';desc.textContent=`다음 회계연도 설비투자 축소를 검증한 기업이 ${c.cuts}곳입니다. AI 관련 주식 비중 축소 여부를 검토할 근거입니다. 매매 전 발표 문맥을 확인하세요.`;badge.textContent='축소 기준 충족';badge.className='status sell';}
 else if(c.positiveExecution>0){headline.textContent='실제 투자 지출 확대 확인';desc.textContent=`최근 PDF에서 ${c.positiveExecution}개 기업의 전년 동기 대비 CAPEX 확대가 확인됐습니다. 다만 차기년도 가이던스와 AI 주식 낙폭이 모두 확인되어야 매수 기준이 충족됩니다.`;badge.textContent='긍정적 근거 · 매수 확정 아님';badge.className='status positive';}
 else {headline.textContent='AI 투자 판단에 추가 근거 필요';desc.textContent='기업 실적 PDF를 업로드하고 차기년도 CAPEX 계획을 검증하세요. 실제 지출 추세와 투자 가이던스는 별도 평가합니다.';badge.textContent='판단 보류';badge.className='status neutral';}
 $('companyGrid').innerHTML=c.rows.map(companyCard).join('');
 $('capexMethods').innerHTML=renderCapexMethods(c.rows);
 $('chartCompany').value=selectedChartCompany;renderChart();renderReports();
 document.querySelectorAll('[data-doc-id]').forEach(btn=>btn.addEventListener('click',()=>{selectedId=btn.dataset.docId;renderReports();document.getElementById('reportDetail').scrollIntoView({behavior:'smooth',block:'center'});}));
}
function renderCapexMethods(rows){
 const name={Alphabet:'Alphabet',Microsoft:'Microsoft',Amazon:'Amazon',Meta:'Meta'};
 return `<div class="method-intro">실제 CAPEX 집행과 향후 투자 계획은 다른 지표입니다. 2026년 수치 가이던스가 있어도 <b>2027년 CAPEX 유지·축소가 확인된 것은 아닙니다.</b></div><div class="method-scroll"><table class="method-table"><thead><tr><th>기업</th><th>2026 Q3 산정 기준</th><th>2026년 투자 가이던스</th><th>2027년 투자 방향</th></tr></thead><tbody>${rows.map(r=>{
  const d=r.doc;if(!d)return `<tr><td><b>${esc(name[r.company])}</b></td><td colspan="3" class="unverified">PDF 업로드 필요 · 모두 미확인</td></tr>`;
  const plan=d.currentYearGuidance,forward=d.forwardOutlook;
  const planText=plan?`${plan.label} (PDF ${plan.page}p)`:'자료에서 숫자 미확인';
  const forwardText=forward?.type==='qualitative_support'?'정성적 투자 지속 의지 · 숫자 미확인':forward?.type==='demand_growth_only'?'AWS 성장 전망만 확인 · CAPEX 미확인':'CAPEX 계획 미확인';
  return `<tr><td><b>${esc(r.company)}</b><small>${esc(d.period)}</small></td><td>${esc(d.capexDefinitionLabel||'정의 미확인')}</td><td>${esc(planText)}</td><td>${esc(forwardText)}<small>축소 판정: ${r.status==='cut'?'검증 완료':r.status==='increase'?'확대 검증':r.status==='maintain'?'유지 검증':'판단 보류'}</small></td></tr>`;
 }).join('')}</tbody></table></div><p class="method-foot">※ Meta 2026년 가이던스에는 금융리스 원금 상환액이 포함됩니다. Amazon은 유형자산 취득액의 총액 기준이며, 매각대금·인센티브 차감 후 현금 지출과는 다릅니다. 전체 CAPEX는 AI 전용 지출액이 아닙니다.</p>`;
}
function chartPoints(company){const all=state.docs.filter(d=>d.company===company).sort((a,b)=>(a.period||'').localeCompare(b.period||''));
 const merged=new Map();for(const d of all){
   for(const q of d.quarterHistory||[])if(n(q.capexM))merged.set(q.period,{period:q.period,value:q.capexM,page:q.page});
   if(d.period&&n(d.quarterCapexM))merged.set(d.period,{period:d.period,value:d.quarterCapexM,page:d.evidence?.[0]?.page});
 }return [...merged.values()].sort((a,b)=>a.period.localeCompare(b.period)).slice(-12);
}
function renderChart(){const points=chartPoints(selectedChartCompany);const holder=$('capexChart');
 if(!points.length){holder.innerHTML='<div class="report-empty">이 기업의 분기별 CAPEX 분석 PDF가 아직 없습니다.</div>';return;}
 const max=Math.max(...points.map(x=>x.value),1);holder.innerHTML=points.map((x,i)=>`<div class="bar-item"><div class="bar-value">${b(x.value)}</div><div class="bar-shape ${i===points.length-1?'latest':''}" style="height:${Math.max(8,Math.round(x.value/max*143))}px" title="${esc(x.period)} ${b(x.value)}"></div><div class="bar-label">${esc(x.period)}</div></div>`).join('');
}
function renderReports(){const docs=[...state.docs].sort((a,b)=>(b.period||'').localeCompare(a.period||'') || (b.importedAt||'').localeCompare(a.importedAt||''));
 if(!docs.some(x=>x.id===selectedId))selectedId=docs[0]?.id||null;
 $('reportList').innerHTML=docs.length?docs.map(d=>`<button type="button" class="report-item ${selectedId===d.id?'active':''}" data-select-doc="${esc(d.id)}"><strong>${esc(d.company)} · ${esc(d.period||'기준 분기 확인 필요')}</strong><small>${esc(d.filename)}${d.seed?' · 제공 PDF 분석 사례':''}</small><span>CAPEX ${b(d.quarterCapexM)} · YoY ${pct(d.yoy)}</span></button>`).join(''):'<div class="report-empty">분석된 PDF가 없습니다. 위에서 첫 보고서를 선택하세요.</div>';
 document.querySelectorAll('[data-select-doc]').forEach(btn=>btn.addEventListener('click',()=>{selectedId=btn.dataset.selectDoc;renderReports()}));
 renderDetail(docs.find(x=>x.id===selectedId));
}
function renderDetail(d){const el=$('reportDetail');if(!d){el.innerHTML='<div class="report-empty">왼쪽에서 분석된 보고서를 선택하면 수치와 원문 근거를 볼 수 있습니다.</div>';return;}
 const guidance=d.guidance||{status:'unknown'};
 const autoGuidance=guidance.auto&&!guidance.verified?' · 자동 감지: 원문 확인 필요':'';
 const trend=d.trend==='expanding'?'긍정 — 전체 설비투자 확대':d.trend==='contracting'?'주의 — 전체 설비투자 축소':'판단 보류 — 변화 미확인';
 el.innerHTML=`<div class="report-detail-head"><div><span class="eyebrow">DOCUMENT ANALYSIS</span><h3>${esc(d.company)} · ${esc(d.period||'기간 미확인')}</h3><p>${esc(d.filename)} · ${Number(d.pages)||'?'}페이지 · ${esc(d.seed?'업로드된 2026 Q3 PDF에서 사전 추출·검증':'이 브라우저에서 분석됨')}</p></div><span class="status ${d.confidence==='review'?'warning':'positive'}">${d.confidence==='review'?'원문 확인 필요':d.seed?'업로드 PDF 대조 완료':d.confidence==='verified'?'수치 검증 완료':'표 추출 완료'}</span></div>
 <div class="detail-numbers"><div><small>분기 CAPEX</small><strong>${b(d.quarterCapexM)}</strong></div><div><small>전년 동기 대비</small><strong>${pct(d.yoy)}</strong></div><div><small>직전 분기 대비</small><strong>${pct(d.qoq)}</strong></div><div><small>12개월 CAPEX</small><strong>${b(d.ttmCapexM)}</strong></div><div><small>전년 동기 CAPEX</small><strong>${b(d.previousYearCapexM)}</strong></div><div><small>현재 추세 해석</small><strong style="font-size:12px">${esc(trend)}</strong></div></div>
 <div class="info-bar" style="margin:0"><span class="info-mark">i</span> ${esc(d.capexDefinitionLabel||'전체 유형자산 취득액')} 기준입니다. AI 전용 투자액과 같지 않으며, 금융리스 포함·매각대금 차감 여부가 다른 기업과 합산하지 마세요.</div>
 <div class="detail-section"><h4>추출 숫자 검토·수정</h4><p>표가 복잡해서 값을 잘못 읽은 경우 PDF 원문을 보고 정정할 수 있습니다. 단위는 모두 <b>백만 달러(USD million)</b>입니다.</p>
 <div class="detail-fields"><div class="field"><label for="editCapexM">현재 분기 CAPEX (백만 USD)</label><input id="editCapexM" type="number" step="any" min="0" value="${n(d.quarterCapexM)?d.quarterCapexM:''}" placeholder="예: 51355"></div><div class="field"><label for="editPreviousM">전년 동기 CAPEX (백만 USD)</label><input id="editPreviousM" type="number" step="any" min="0" value="${n(d.previousYearCapexM)?d.previousYearCapexM:''}" placeholder="예: 23953"></div><div class="field"><label for="editTTMM">최근 12개월 CAPEX (백만 USD)</label><input id="editTTMM" type="number" step="any" min="0" value="${n(d.ttmCapexM)?d.ttmCapexM:''}" placeholder="예: 159804"></div><div class="field"><label for="editPeriod">기준 분기</label><input id="editPeriod" type="text" value="${esc(d.period||'')}" placeholder="예: 2026Q3"></div></div>
 <div class="detail-actions"><button type="button" class="button outline" id="saveNumbers">원문 대조한 수치 저장</button></div></div>
 <div class="detail-section"><h4>실제 CAPEX의 정의 · 연간 가이던스</h4><p><b>이번 분기 산정 기준:</b> ${esc(d.capexDefinitionLabel||'확인 필요')}.</p>
 <p><b>${d.currentYearGuidance?.year||'현재 회계연도'}년 투자 전망:</b> ${d.currentYearGuidance?esc(d.currentYearGuidance.label+' · PDF '+d.currentYearGuidance.page+'페이지'):'이 보고서에 수치 가이던스 미확인'}. 이 수치/범위는 다음 연도의 CAPEX 방향을 확정하지 않습니다.</p>
 <p><b>차기년도 투자 전망:</b> ${esc(d.forwardOutlook?.label||'미확인')} ${d.forwardOutlook?.page?'(PDF '+d.forwardOutlook.page+'페이지)':''}. ${d.forwardOutlook?.type==='qualitative_support'?'향후 투자 의지에 대한 정성 근거로 표시하되 자동 매수 조건에는 넣지 않습니다.':''}</p>
 ${n(d.additional?.cashNetCapexM)?`<p><b>참고 — 매각대금 등 차감 후 현금 취득액:</b> ${b(d.additional.cashNetCapexM)} (총액과 구분)</p>`:''}
 </div>
 <div class="detail-section"><h4>차기년도 투자 계획 — 별도 검증</h4><p>자동 인식: <b>${guidance.status==='cut'?'차기년도 축소 언급':guidance.status==='increase'?'차기년도 확대 언급':guidance.status==='maintain'?'차기년도 유지 언급':'명확한 수치 가이던스 없음'}</b>${esc(autoGuidance)}. <strong>검증 완료</strong> 체크 후 저장된 명시적 가이던스만 전략의 기업 수에 포함됩니다.</p>
 <div class="detail-fields"><div class="field"><label for="editGuidance">다음 회계연도 CAPEX 방향</label><select id="editGuidance"><option value="unknown">미확인 / 판단 보류</option><option value="increase">확대 발표</option><option value="maintain">유지 발표</option><option value="cut">축소 발표</option></select></div><div class="field"><label for="editGuidancePage">원문 페이지 번호</label><input id="editGuidancePage" type="number" min="1" max="999" placeholder="예: 4" value="${guidance.page||''}"></div></div>
 <div class="field"><label for="guidanceProof">확인한 근거 원문 또는 인용(필수)</label><textarea id="guidanceProof" placeholder="다음 해 CAPEX 확대/유지/축소를 언급한 원문 문장">${esc(guidance.status==='unknown'?'':guidance.text||'')}</textarea></div>
 <label style="display:flex;gap:9px;align-items:center;font-size:11px"><input id="verifyGuidance" type="checkbox" ${guidance.verified?'checked':''} style="width:auto"> 원문과 기준 연도를 직접 확인했습니다 (이후 매매 조건에 반영)</label>
 <div class="detail-actions"><button class="button danger" type="button" id="deleteReport">기록 삭제</button><button class="button dark" type="button" id="saveReview">가이던스 검증 결과 저장</button></div></div>
 <div class="detail-section"><h4>PDF 원문 근거 · 페이지</h4>${(d.evidence||[]).length?(d.evidence||[]).map(e=>`<blockquote><small>PDF ${Number(e.page)||'?'}페이지 · ${esc(e.label)}</small>${esc(e.text)}</blockquote>`).join(''):'<p>원문 추출 근거가 없습니다. 수동 확인이 필요합니다.</p>'}</div>
 <div class="detail-section"><h4>추출 해석</h4><p>${esc(d.notes||'원문과 비교하여 숫자 정확도를 확인하세요.')}</p><p class="warning-text">이 문서는 1개 기업의 CAPEX 증감만 보여줍니다. 'AI 주식 매수'는 AI 관련 주가 낙폭과 기업들의 차기년도 투자 유지 근거가 모두 확인되어야 합니다.</p></div>`;
 $('editGuidance').value=guidance.status||'unknown';
 $('saveNumbers').onclick=()=>{
  const period=$('editPeriod').value.trim().toUpperCase();
  if(!/^20\d{2}Q[1-4]$/.test(period)){toast('기준 분기는 YYYYQ1~YYYYQ4 형식으로 입력하세요.');return;}
  const parse=id=>{const v=$(id).value.trim();if(!v)return null;const out=Number(v);return Number.isFinite(out)&&out>=0?out:NaN;};
  const capex=parse('editCapexM'), prior=parse('editPreviousM'), ttm=parse('editTTMM');
  if([capex,prior,ttm].some(x=>Number.isNaN(x))){toast('CAPEX는 0 이상의 숫자 또는 빈칸으로 입력하세요.');return;}
  if(capex===null){toast('현재 분기 CAPEX 숫자를 입력하세요.');return;}
  const oldPeriod=d.period;d.period=period;d.year=Number(period.slice(0,4));d.quarter=Number(period.slice(-1));d.quarterCapexM=capex;d.previousYearCapexM=prior;d.ttmCapexM=ttm;
  d.yoy=S.ratio(capex,prior);
  d.quarterHistory=(d.quarterHistory||[]).map(x=>x.period===oldPeriod?{...x,period,capexM:capex}:x);
  const previous=d.quarterHistory?.length>=2?d.quarterHistory[d.quarterHistory.length-2].capexM:null;
  d.qoq=S.ratio(capex,previous);d.trend=d.yoy===null?'unknown':d.yoy>10?'expanding':d.yoy<-10?'contracting':'stable';
  d.confidence='verified';d.notes='사용자가 PDF 원문 숫자를 확인·수정했습니다. 전체 유형자산 취득액이며 AI 전용 CAPEX로 단정하지 않습니다.';
  save();renderAi();renderDashboard();toast('검증한 CAPEX 수치와 성장률을 다시 계산했습니다.');
 };
 $('saveReview').onclick=()=>{
  const status=$('editGuidance').value;const proof=$('guidanceProof').value.trim();const page=Number($('editGuidancePage').value);const checked=$('verifyGuidance').checked;
  if(checked && (status==='unknown'||proof.length<12||!Number.isInteger(page)||page<1||page>(d.pages||999))){toast('차기년도 가이던스 검증에는 투자 방향·12자 이상 원문·올바른 페이지 번호가 필요합니다.');return;}
  if(status!=='unknown' && !proof){toast('미확인이 아니라면 원문 인용을 입력하세요.');return;}
  d.guidance={status,text:status==='unknown'?'자료에서 확인되지 않음':proof,page:status==='unknown'?null:(Number.isInteger(page)&&page>0?page:null),period:status==='unknown'?null:'next_year',verified:status!=='unknown'&&checked,auto:false};
  if(status!=='unknown'&&proof.length>=12&&d.guidance.page)d.evidence=[...(d.evidence||[]).filter(x=>x.label!=='검증된 가이던스'),{label:'검증된 가이던스',page:d.guidance.page,text:proof}];
  save();renderAi();renderDashboard();toast('기업 CAPEX 가이던스 검증 상태를 저장했습니다.');
 };
 $('deleteReport').onclick=()=>{if(!confirm(`${d.company} ${d.period} 분석 기록을 삭제할까요?`))return;state.docs=state.docs.filter(x=>x.id!==d.id);save();selectedId=state.docs[0]?.id||null;renderAi();renderDashboard();toast('분석 기록을 삭제했습니다.');};
}
function renderInputs(){const data=getInputs();$('inputForms').innerHTML=GROUPS.map(g=>`<section class="paper input-group"><h2>${g.name}</h2><p>${g.desc}</p><div class="input-grid">${g.items.map(([key,label,type,placeholder])=>`<div class="field"><label for="input_${key}">${label}${state.manual[key]!==undefined?'<span style="margin-left:5px;color:#4d85bb">· 수동입력</span>':''}</label>${type==='bool'?`<select id="input_${key}" data-key="${key}" data-type="bool"><option value="">미확인</option><option value="true" ${data[key]===true?'selected':''}>예</option><option value="false" ${data[key]===false?'selected':''}>아니요</option></select>`:`<input id="input_${key}" data-key="${key}" data-type="number" type="number" step="any" placeholder="예: ${placeholder||''}" value="${n(data[key])?data[key]:''}">`}${state.manual[key]===undefined&&n(market.data?.[key])?`<small>자동 시세: ${fmt(market.data[key],2)} (수동 입력 시 우선)</small>`:''}</div>`).join('')}</div></section>`).join('');}
function saveInputs(){let next={};document.querySelectorAll('[data-key]').forEach(el=>{
 const key=el.dataset.key,v=el.value;const auto=market.data?.[key];
 if(v===''){if(auto!==undefined)next[key]=null;return;}
 const parsed=el.dataset.type==='bool'?(v==='true'):Number(v);
 if(el.dataset.type==='number'&&!Number.isFinite(parsed))return;
 if(parsed!==auto)next[key]=parsed;
 });state.manual=next;save();renderDashboard();toast('지표를 저장하고 5개 자산 조건을 다시 평가했습니다.');changeView('dashboard');}
function renderRules(){const rules=[
 ['① 미국 S&P500','20% 하락만으로 매수하지 않습니다. 예상 이익수익률과 미국 10년물 국채금리의 차이가 2%p 이상이어야 매수 검토, 0.5%p 이하이면 상대 고평가를 점검합니다.','가격 + 상대 밸류에이션'],
 ['② AI','AI 관련 주식이 30% 이상 하락했더라도 4대 기업의 투자 유지 근거가 필요합니다. 1·4·7·10월 말 실적 시즌에 CAPEX 계획을 확인하고 4곳 중 2곳이 다음 해 지출 축소를 발표하면 경계합니다.','실제 CAPEX와 향후 가이던스 구분'],
 ['③ 한국 커버드콜','코스피 25% 하락 + 예상 PER 8배 이하에서 매수 검토. 반도체 수출 증가율 3회 연속 둔화 + 메모리 가격 2개월 하락이면 축소를 검토합니다. 상승 수익 제한과 원금 손실 위험이 있습니다.','반도체 수출 × 메모리 가격'],
 ['④ 금','달러 기준 금이 고점 대비 25% 이상 하락하고 중앙은행 금 매입 유지 또는 미국 금리 인하 전환이 확인될 때 매수 검토. 금리 지속 상승과 중앙은행 매입 감소가 동시에 발생하면 축소 근거입니다.','달러 기준 가격 + 중앙은행 수요'],
 ['⑥ 현금','주식 이익수익률이 국채에 비해 낮아지면 현금을 확보합니다. 투자자산 전체가 고점 대비 15%·25%·35% 하락하면 나눠서 투입을 검토합니다.','15% → 25% → 35% 단계적 투입']
 ];$('principles').innerHTML=rules.map(r=>`<div class="principle"><h3>${r[0]}</h3><p>${esc(r[1])}</p><span class="strategy-tag">${esc(r[2])}</span></div>`).join('');
 $('thresholdInputs').innerHTML=TH_GROUP.map(([key,label])=>`<div class="field"><label for="th_${key}">${label}</label><input id="th_${key}" type="number" step="any" value="${state.thresholds[key]}"></div>`).join('');}
function renderSettings(){const sources=market.meta?.sources||{},issues=market.meta?.issues||[];
 $('feedDetails').innerHTML=`<b>마지막 수집:</b> ${dateText(market.updatedAt)}<br><b>지표:</b> ${Object.keys(sources).length}개 수집 표시<br><b>수집 오류:</b> ${issues.length}개<br><b>원본:</b> data.json (자동 시장 값)${issues.length?`<br><b>주의:</b> ${esc(issues.slice(0,3).join(' | '))}`:''}`;}
async function fetchMarket(silent=false){if(!/^https?:$/.test(location.protocol)){if(!silent)toast('로컬 파일 모드에서는 자동 시세 URL을 읽을 수 없습니다. 로컬 서버 또는 GitHub Pages에서 확인하세요.');return;}
 try{const url=new URL('data.json',location.href);url.searchParams.set('_',Date.now());
 const resp=await fetch(url,{cache:'no-store'});if(!resp.ok)throw Error('HTTP '+resp.status);const raw=await resp.json();if(!raw||!raw.data||typeof raw.data!=='object')throw Error('data.json 형식 오류');
 market=raw;state.lastMarket=raw;save();renderDashboard();if(view==='inputs')renderInputs();if(view==='settings')renderSettings();if(!silent)toast('자동 시장 시세 스냅샷을 읽었습니다.');
 }catch(e){console.warn('Market snapshot unavailable',e);if(!silent)toast('시세를 불러오지 못했습니다: '+e.message);}}
async function processFiles(files){const selected=[...files].filter(file=>file&&/\.pdf$/i.test(file.name));if(!selected.length){toast('PDF 파일(.pdf)을 선택하세요.');return;}
 if(selected.length>10){toast('한 번에 PDF 10개 이하로 분석해주세요.');return;}
 const progress=$('pdfProgress');progress.classList.remove('hidden');let done=0;
 for(const file of selected){try{
 if(file.size>28*1024*1024)throw Error('파일 크기가 28MB를 넘습니다.');
 progress.textContent=`${file.name} · PDF 페이지 추출 중...`;
 const pages=await P.extractPdfPages(file,(i,total)=>{progress.textContent=`${file.name} · ${i}/${total}페이지 분석 중`});
 const doc=P.parseReport(pages,file.name);
 if(doc.company==='Other')toast('기업 이름을 판독하지 못했습니다. 결과를 검토하세요.');
 const priorIdx=state.docs.findIndex(x=>x.company===doc.company && x.period===doc.period && doc.period!==null);
  if(priorIdx>=0){
    const old=state.docs[priorIdx];
    if(old.seed && n(old.quarterCapexM) && old.quarterCapexM===doc.quarterCapexM){
      selectedId=old.id;done++;toast(`${doc.company} ${doc.period}는 이미 검증된 기록이 있습니다. 중복 등록하지 않았습니다.`);continue;
    }
    if(old.seed && (doc.confidence==='review'||!n(doc.quarterCapexM))){
      selectedId=old.id;toast(`${doc.company} ${doc.period}: 자동 판독이 불완전하여 기존 검증본을 보존했습니다.`);continue;
    }
    state.docs[priorIdx]=doc;
  }else{state.docs.push(doc)}
 selectedId=doc.id;selectedChartCompany=S.COMPANY_KEYS.includes(doc.company)?doc.company:selectedChartCompany;
 done++;save();renderAi();renderDashboard();
 }catch(e){console.error('PDF parsing failed',e);toast(`${file.name}: ${e.message}`);}
 }
 progress.textContent=done?`완료 · ${done}개 PDF 분석. 수치와 페이지 출처를 확인하고 차기년도 가이던스는 별도로 검증하세요.`:'분석 실패 · 텍스트 선택 가능한 PDF와 인터넷 연결을 확인하세요.';
 setTimeout(()=>progress.classList.add('hidden'),7500);
 if(done)toast(`${done}개 보고서를 분석해 AI 투자 항목에 반영했습니다.`);
}
function downloadText(name,payload,mime){const url=URL.createObjectURL(new Blob([payload],{type:mime}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);}
function download(name,obj){downloadText(name,JSON.stringify(obj,null,2),'application/json;charset=utf-8');}
function exportCapexCsv(){
 const cols=['company','period','quarterCapexM','previousYearCapexM','yoy','qoq','ttmCapexM','capexDefinitionLabel','currentYearGuidance','forwardOutlook','nextYearGuidanceStatus','nextYearVerified','pdfFile','pages'];
 const rows=state.docs.map(d=>[d.company,d.period,d.quarterCapexM,d.previousYearCapexM,d.yoy,d.qoq,d.ttmCapexM,d.capexDefinitionLabel,d.currentYearGuidance?.label,d.forwardOutlook?.label,d.guidance?.status,d.guidance?.verified,d.filename,d.pages]);
 const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 downloadText('signal-atlas-capex.csv','\ufeff'+[cols,...rows].map(row=>row.map(q).join(',')).join('\r\n'),'text/csv;charset=utf-8');
}
function exportPublicSeed(){
 if(!confirm('현재 PDF 분석 데이터(기업 수치, 파일명, 인용문)를 GitHub에 공개할 수 있는 JS 파일로 내보낼까요? 원본 PDF는 포함되지 않지만 다운로드한 JS를 공개 저장소에 올리면 추출 결과는 누구나 볼 수 있습니다.'))return;
 const version='custom-'+new Date().toISOString();
 const content='/* Public, reviewed CAPEX results — original PDFs are not included. */\n'+
   'window.SIGNAL_ATLAS_FILINGS_VERSION = '+JSON.stringify(version)+';\n'+
   'window.SIGNAL_ATLAS_FILINGS_SEED = '+JSON.stringify(state.docs.map(d=>({...d,seed:true})),null,2)+';\n';
 downloadText('seed-filings-2026q3.js',content,'text/javascript;charset=utf-8');
}
function wire(){
 document.querySelectorAll('[data-view]').forEach(x=>x.addEventListener('click',()=>changeView(x.dataset.view)));
 for(const id of ['topPdfButton','heroPdfButton'])$(id).addEventListener('click',()=>{$('pdfFileInput').value='';changeView('ai');$('pdfFileInput').click()});
 $('choosePdf').onclick=e=>{e.stopPropagation();$('pdfFileInput').value='';$('pdfFileInput').click()};
 $('dropArea').onclick=e=>{if(e.target.closest('button'))return;$('pdfFileInput').value='';$('pdfFileInput').click()};
 $('dropArea').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('pdfFileInput').click()}};
 $('dropArea').ondragenter=e=>{e.preventDefault();$('dropArea').classList.add('dragging')};$('dropArea').ondragover=e=>{e.preventDefault();$('dropArea').classList.add('dragging')};$('dropArea').ondragleave=e=>{e.preventDefault();$('dropArea').classList.remove('dragging')};$('dropArea').ondrop=e=>{e.preventDefault();$('dropArea').classList.remove('dragging');processFiles(e.dataTransfer.files)};
 $('pdfFileInput').onchange=e=>processFiles(e.target.files);
 $('recalculate').onclick=()=>{renderDashboard();toast('최신 입력과 PDF 기록으로 조건을 다시 평가했습니다.')};
 $('heroRulesButton').onclick=()=>changeView('rules');$('overviewAi').onclick=()=>changeView('ai');$('overviewSources').onclick=()=>changeView('settings');
 $('chartCompany').onchange=e=>{selectedChartCompany=e.target.value;renderChart()};
 $('saveInputs').onclick=saveInputs;$('clearInputs').onclick=()=>{if(confirm('수동 입력을 모두 삭제하고 자동 시세만 남길까요?')){state.manual={};save();renderInputs();renderDashboard();toast('수동 입력 값을 비웠습니다.')}};
 $('saveThresholds').onclick=()=>{const next={};for(const [key] of TH_GROUP){const raw=$('th_'+key).value;if(!raw.trim()||!Number.isFinite(Number(raw))){toast('임계값을 모두 숫자로 입력하세요.');return;}next[key]=Number(raw)}
 if(next.cash1>next.cash2||next.cash2>next.cash3){toast('현금 투입 하락률 1차 ≤ 2차 ≤ 3차를 지켜주세요.');return;}
 if(!Number.isInteger(next.capexCuts)||next.capexCuts<1||next.capexCuts>4){toast('CAPEX 축소 기업 수 기준은 1~4 정수여야 합니다.');return;}
 state.thresholds=next;save();renderDashboard();toast('투자 임계값을 저장했습니다.');};
 $('resetThresholds').onclick=()=>{state.thresholds={...S.DEFAULTS};save();renderRules();renderDashboard();toast('전략 기본 임계값을 복원했습니다.');};
 $('exportAll').onclick=()=>download('signal-atlas-backup.json',{schema:'signal-atlas-v2',savedAt:new Date().toISOString(),manual:state.manual,docs:state.docs,thresholds:state.thresholds});
 $('exportCapex').onclick=()=>download('signal-atlas-capex.json',{schema:'signal-atlas-capex-v1',savedAt:new Date().toISOString(),docs:state.docs});
 $('exportCsv').onclick=exportCapexCsv; $('exportSeed').onclick=exportPublicSeed;
 $('importAll').onclick=()=>$('importFile').click();
 $('importFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{
 if(file.size>2*1024*1024)throw Error('백업 JSON은 2MB 이하만 허용합니다.');
 const loaded=JSON.parse(await file.text());if(!loaded||!['signal-atlas-v2','signal-atlas-capex-v1'].includes(loaded.schema)||!Array.isArray(loaded.docs))throw Error('백업 파일 형식이 올바르지 않습니다.');
 if(loaded.docs.length>300)throw Error('최대 300개 보고서까지만 가져옵니다.');
 if(!confirm(`${loaded.docs.length}개 기업 분석 기록을 불러올까요? 기존 기록과 같은 기업·분기는 덮어씁니다.`))return;
 const docs=[...state.docs];for(const d of loaded.docs){if(!d||typeof d.id!=='string'||typeof d.company!=='string'||!Array.isArray(d.evidence))continue;
 const idx=docs.findIndex(x=>x.company===d.company&&x.period===d.period&&d.period);if(idx>=0)docs[idx]=d;else docs.push(d);
 }state.docs=docs.slice(-300);
 if(loaded.schema==='signal-atlas-v2'){state.manual=loaded.manual||{};state.thresholds={...S.DEFAULTS,...loaded.thresholds};}
 save();renderDashboard();renderAi();toast('JSON 백업 데이터를 불러왔습니다.');
 }catch(err){toast('백업 불러오기 실패: '+err.message);}finally{e.target.value=''}};
 $('reloadMarket').onclick=()=>fetchMarket(false);
}
function init(){const now=new Date();$('todayText').textContent=now.toLocaleDateString('ko-KR',{year:'numeric',month:'short',day:'numeric',weekday:'short'});
 wire();renderDashboard();renderAi();renderRules();renderInputs();renderSettings();fetchMarket(true);
}
init();
})();
