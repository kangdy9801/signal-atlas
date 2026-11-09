/* Signal Atlas — transparent, on-device financial PDF extraction.
 * Heuristic parsing only. Does not send the source PDF to a server and does not call an LLM.
 * CAPEX definitions are company-specific; forward guidance is not equated with historic cash CAPEX.
 */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SignalPdfAnalyzer=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const COMPANIES=[
  ['Alphabet',/\b(?:Alphabet(?:\s+Inc\.)?|Google(?:\s+LLC|\s+Inc\.)?)\b/i],
  ['Microsoft',/\bMicrosoft(?:\s+Corporation|\s+Corp\.)?\b/i],
  ['Amazon',/\bAmazon(?:\.com(?:,?\s+Inc\.)?|\s+Inc\.)?\b/i],
  ['Meta',/\bMeta\s+Platforms(?:,?\s+Inc\.)?\b/i]
 ];
 const normalize=s=>String(s||'').replace(/[\u2212\u2013\u2014]/g,'-').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
 const finite=x=>typeof x==='number'&&Number.isFinite(x);
 const round2=x=>finite(x)?Math.round(x*100)/100:null;
 function groupItems(items){
  const words=(items||[]).filter(x=>x&&String(x.str||'').trim()).map(x=>({str:String(x.str),x:Number(x.transform?.[4]||0),y:Number(x.transform?.[5]||0)}));
  words.sort((a,b)=>b.y-a.y||a.x-b.x);const rows=[];
  for(const w of words){let row=rows.length&&Math.abs(rows[rows.length-1].y-w.y)<2.7?rows[rows.length-1]:null;
   if(!row){row={y:w.y,parts:[]};rows.push(row)}row.parts.push(w);
  }
  return rows.map(r=>normalize(r.parts.sort((a,b)=>a.x-b.x).map(w=>w.str).join(' '))).filter(Boolean);
 }
 function makePage(number,text,rows){const lines=Array.isArray(rows)&&rows.length?rows:String(text||'').split(/\n+/);
  return {page:number,lines:lines.map(normalize).filter(Boolean),text:String(text||lines.join('\n'))};}
 function numericRow(line){const str=String(line||'').replace(/\$|\u00a0/g,' ');
  return [...str.matchAll(/\(?-?\d{1,3}(?:,\d{3})+(?:\.\d+)?\)?|\(?-?\d+(?:\.\d+)?\)?/g)]
   .map(m=>({value:Math.abs(Number(m[0].replace(/[^\d.]/g,''))),index:m.index,raw:m[0]})).filter(x=>finite(x.value));
 }
 function yearAndQuarter(pages,filename){
  const lead=pages.slice(0,4).map(p=>p.text).join(' ').slice(0,16000);
  let m=lead.match(/(?:quarter|three months|quarter ended|ended)\s+(?:ended\s+)?(?:March|June|September|December)\s+\d{1,2},?\s*(20\d{2})/i);
  if(m){let mon=m[0].match(/March|June|September|December/i)?.[0].toLowerCase();return {year:Number(m[1]),quarter:({march:1,june:2,september:3,december:4})[mon]};}
  m=lead.match(/(?:Q\s*([1-4])|([1-4])(?:st|nd|rd|th)\s+quarter|(?:first|second|third|fourth)\s+quarter)\s*(?:of\s*)?(20\d{2})/i);
  if(m){const q=Number(m[1]||m[2]||{first:1,second:2,third:3,fourth:4}[m[0].toLowerCase().match(/first|second|third|fourth/)?.[0]]);return {year:Number(m[3]),quarter:q};}
  m=lead.match(/(?:March|June|September|December)\s+(?:30|31),?\s*(20\d{2})/i);
  if(m){let mon=m[0].match(/March|June|September|December/i)?.[0].toLowerCase();return {year:Number(m[1]),quarter:({march:1,june:2,september:3,december:4})[mon]};}
  m=String(filename||'').match(/(20\d{2})[^\d]{0,5}[qQ]([1-4])|[qQ]([1-4])[^\d]{0,5}(20\d{2})/);
  return m?{year:Number(m[1]||m[4]),quarter:Number(m[2]||m[3])}:{year:null,quarter:null};
 }
 function findCompany(pages,filename){const lead=pages.slice(0,3).map(p=>p.text).join(' ').slice(0,9000);
  for(const [key,re] of COMPANIES)if(re.test(lead))return key;
  for(const [key,re] of COMPANIES)if(re.test(filename||''))return key;
  return 'Other';
 }
 function ev(page,label,text){return {page,label,text:normalize(text).slice(0,700)};}
 function rowCandidates(pages,pattern){const out=[];
  for(const p of pages){for(let i=0;i<p.lines.length;i++){
   const line=p.lines[i];if(!pattern.test(line))continue;
   if(/(?:acquired but not yet paid|free cash flow is|other investing|\bdefined by\b|acquisitions of businesses)/i.test(line))continue;
   const match=line.match(pattern);if(!match)continue;
   const after=line.slice(match.index+match[0].length);
   let vals=numericRow(after).map(x=>x.value);
   if(!vals.length && p.lines[i+1]&&/^\s*[\(\$\d-]/.test(p.lines[i+1]))vals=numericRow(p.lines[i+1]).map(x=>x.value);
   if(vals.length<2)continue;
   const head=p.text.slice(0,2200);const cashFlow=/statements? of cash flows/i.test(head);
   const nearby=p.lines.slice(Math.max(0,i-8),i+1).join(' ');
   const reconciliation=/free cash flow|reconciliation of gaap|less:/i.test(nearby);
   const score=(cashFlow?50:0)+(reconciliation?-8:0)+(vals.length>=6?10:vals.length===5?8:vals.length===4?6:0)-(after.length>350?30:0);
   out.push({page:p.page,line,values:vals,score,nearby});
  }}return out.sort((a,b)=>b.score-a.score||a.page-b.page);
 }
 const CAPEX_ROW=/\b(?:purchases of property and equipment|less:\s*purchases of property and equipment)\b/i;
 const FINLEASE_ROW=/\bprincipal payments on finance leases\b/i;
 const SALE_ROW=/\bproceeds from property and equipment sales and incentives\b/i;
 function capexCandidates(pages){return rowCandidates(pages,CAPEX_ROW)}
 function classifyGuidance(pages,reportYear){
  // Only a next-fiscal-year CAPEX change, with a source citation, can be proposed for user verification.
  // A company cutting an unrelated expense or predicting revenue growth is not a CAPEX change.
  let matched=[];
  for(const p of pages){const plain=p.text.replace(/\n/g,' ').replace(/\s+/g,' ');
   const sentences=plain.match(/[^.!?]+[.!?]?/g)||[];
   for(const s of sentences){const v=normalize(s);
    if(v.length>700||!/\b(?:capex|capital expenditures?|capital spending|cash capital expenditures)\b/i.test(v))continue;
    if(!/\b(?:next year|next fiscal year|20\d{2})\b/i.test(v))continue;
    const target=reportYear&&new RegExp('\\b'+(reportYear+1)+'\\b').test(v)||/next\s+(?:fiscal\s+)?year/i.test(v);
    if(!target)continue;
    const cuts=/\b(?:cut|cuts|reduce|reduction|decrease|decreasing|lower|decline|scale back)\b/i.test(v);
    const increase=/\b(?:increase|increasing|grow|higher|expand|ramp up|accelerate)\b/i.test(v);
    const maintain=/\b(?:maintain|stable|steady|flat|unchanged|continue)\b/i.test(v);
    if(cuts||increase||maintain)matched.push({status:cuts?'cut':increase?'increase':'maintain',text:v,page:p.page});
   }
  }
  if(matched.length){const m=matched[0];return {...m,period:'next_year',auto:true,verified:false};}
  return {status:'unknown',text:'차기년도 CAPEX 축소·유지·확대의 명시적 수치/계획을 이 PDF에서 확정하지 못했습니다.',page:null,period:null,auto:true,verified:false};
 }
 function currentYearPlan(pages,company,year){
  if(!year)return null;
  if(company==='Meta'){
   // This particular earnings release splits "$135-" and "145 billion" across pages 2 and 3.
   for(const p of pages){const ix=p.lines.findIndex(x=>/We anticipate\s+20\d{2}\s+capital expenditures/i.test(x));
    if(ix<0)continue;
    const first=normalize(p.lines[ix]);
    const from=first.match(/range of \$\s*(\d{2,3})\s*-\s*$/i);
    const next=pages.find(x=>x.page===p.page+1);
    const nextLine=next?.lines.find(x=>/^(\d{2,3})\s+billion/i.test(x));
    if(from&&nextLine){const hi=Number(nextLine.match(/^(\d{2,3})/)[1]);return {year,lowB:Number(from[1]),highB:hi,label:`${from[1]}~${hi}B USD`,page:p.page,definition:'유형자산 취득 + 금융리스 원금 상환',text:normalize(first+' '+nextLine)};}
    const m=first.match(/range of \$\s*(\d{2,3})\s*-\s*(\d{2,3})\s+billion/i);
    if(m)return {year,lowB:Number(m[1]),highB:Number(m[2]),label:`${m[1]}~${m[2]}B USD`,page:p.page,definition:'유형자산 취득 + 금융리스 원금 상환',text:first};
   }
  }
  if(company==='Amazon'){
   for(const p of pages){const s=p.lines.find(x=>/expect\s+20\d{2}\s+cash capital expenditures.*\$\s*\d+/i.test(x));
    if(s){const m=s.match(/\$\s*([\d.,]+)\s+billion/i);if(m)return {year,approxB:Number(m[1]),label:`약 ${m[1]}B USD`,page:p.page,definition:'현금 CAPEX 가이던스',text:s};}
   }
  }
  return null;
 }
 function outlook(pages,company,year){
  if(company==='Meta'){
   for(const p of pages){const lines=p.lines;for(let i=0;i<lines.length;i++){
    if(/looking beyond\s+20\d{2}/i.test(lines[i])){
     const quote=normalize(lines.slice(i,i+5).join(' '));
     if(/investing aggressively|invest aggressively/i.test(quote))return {type:'qualitative_support',label:'차기년도에도 공격적 투자 의지(정성)',page:p.page,text:quote.slice(0,600),period:String(year+1),notNumericCapex:true};
    }
   }}
  }
  if(company==='Amazon')return {type:'demand_growth_only',label:'AWS 수요·성장 전망은 있으나 차기년도 CAPEX 미확인',page:1,text:'2027~2028년 AWS 매출 성장률 전망은 2027년 CAPEX 확대·축소 계획과 동일하지 않습니다.',period:String(year+1),notNumericCapex:true};
  return {type:'unknown',label:'차기년도 투자 계획 미확인',page:null,text:'',period:String(year+1),notNumericCapex:true};
 }
 function parseReport(rawPages,filename='document.pdf'){
  const pages=rawPages.map((p,i)=>Array.isArray(p)?makePage(i+1,'',p):makePage(p.page||i+1,p.text,p.lines||p.rows));
  const {year,quarter}=yearAndQuarter(pages,filename),company=findCompany(pages,filename),period=year&&quarter?`${year}Q${quarter}`:null;
  const c=capexCandidates(pages),cash=c.find(x=>x.values.length>=4&&/statements? of cash flows/i.test((pages.find(p=>p.page===x.page)?.text||'').slice(0,2200)))||c.find(x=>x.values.length>=4);
  const fiv=c.find(x=>x.values.length===5&&/\bQ\s*[1-4]\s*20\d{2}\b/i.test(x.nearby));
  const evidence=[],history=[];
  let cur=null,prev=null,ttm=null,capexDefinition='미확인',capexDefinitionLabel='CAPEX 정의 확인 필요',cashNet=null;
  const additional={};let confidence='review';
  const rate=(x,y)=>finite(x)&&finite(y)&&y>0?(x/y-1)*100:null;
  if(company==='Alphabet'&&cash&&cash.values.length>=4){
   prev=cash.values[0];cur=cash.values[1];capexDefinition='ppe_cash_purchases';capexDefinitionLabel='유형자산 현금 취득액';
   evidence.push(ev(cash.page,'현금흐름표: 당기·전년 분기 CAPEX',cash.line));
   if(fiv&&period){const values=fiv.values;
    for(let i=0;i<4;i++){const offset=3-i,serial=year*4+(quarter-1)-offset;
     history.push({period:`${Math.floor(serial/4)}Q${serial%4+1}`,capexM:values[i],page:fiv.page});}
    ttm=values[4];evidence.push(ev(fiv.page,'4개 분기·최근 12개월 CAPEX',fiv.line));
    if(cur!==values[3])confidence='review';else confidence='high';
   }else confidence='medium';
  }
  else if(company==='Meta'&&cash&&cash.values.length>=4){
   // Meta presents 2026 / 2025, unlike Alphabet and Amazon (2025 / 2026).
   const l=rowCandidates(pages,FINLEASE_ROW).find(x=>x.page===cash.page&&x.values.length>=4)||rowCandidates(pages,FINLEASE_ROW).find(x=>x.values.length>=4);
   if(l){cur=cash.values[0]+l.values[0];prev=cash.values[1]+l.values[1];
    additional.cashPurchasesCurrentM=cash.values[0];additional.leasePrincipalCurrentM=l.values[0];
    additional.cashPurchasesPreviousM=cash.values[1];additional.leasePrincipalPreviousM=l.values[1];
    additional.ytdCapexM=cash.values[2]+l.values[2];
    capexDefinition='ppe_plus_lease_principal';capexDefinitionLabel='유형자산 취득 + 금융리스 원금 상환';
    evidence.push(ev(cash.page,'현금흐름표: 유형자산 취득',cash.line));evidence.push(ev(l.page,'현금흐름표: 금융리스 원금 상환',l.line));confidence='high';
   }
  }
  else if(company==='Amazon'&&cash&&cash.values.length>=6){
   cur=cash.values[1];prev=cash.values[0];ttm=cash.values[5];additional.ytdCapexM=cash.values[3];
   const sale=rowCandidates(pages,SALE_ROW).find(x=>x.page===cash.page&&x.values.length>=6);
   if(sale){cashNet=cur-sale.values[1];additional.cashNetCapexM=cashNet;evidence.push(ev(sale.page,'유형자산 매각대금·인센티브',sale.line));}
   capexDefinition='ppe_cash_purchases_gross';capexDefinitionLabel='유형자산 취득액(매각대금 차감 전)';
   evidence.unshift(ev(cash.page,'현금흐름표: 총 유형자산 취득액',cash.line));confidence='high';
  }
  else if(cash&&cash.values.length>=4){
   // Unknown company: refuse to assign current/prior ordering without checked source.
   evidence.push(ev(cash.page,'CAPEX 후보 - 열 순서 원문 확인 필요',cash.line));
  }
  if(!finite(cur)||!period)confidence='review';
  if(finite(cur)&&period&&!history.length)history.push({period,capexM:cur,page:cash?.page});
  const yoy=rate(cur,prev),priorQ=history.length>1?history[history.length-2].capexM:null,qoq=rate(cur,priorQ);
  const trend=yoy===null?'unknown':yoy>10?'expanding':yoy<-10?'contracting':'stable';
  const plan=currentYearPlan(pages,company,year),future=outlook(pages,company,year),guidance=classifyGuidance(pages,year);
  if(plan)evidence.push(ev(plan.page,`${plan.year}년 CAPEX 가이던스`,plan.text));
  if(future.page)evidence.push(ev(future.page,'차기년도 투자 방향: 정성 근거',future.text));
  if(guidance.page)evidence.push(ev(guidance.page,'차기년도 CAPEX 감지: 검증 필요',guidance.text));
  let ai=0;for(const p of pages){if(ai>=2)break;
   const line=p.lines.find(x=>/\b(?:AI infrastructure|AI investments|artificial intelligence|data cent(?:er|re)|TPU systems)\b/i.test(x));
   if(line){evidence.push(ev(p.page,'AI 인프라 관련 언급',line));ai++;}}
  return {id:`${company}-${period||'unknown'}-${Date.now()}`,company,period,year,quarter,filename,
   quarterCapexM:cur,previousYearCapexM:prev,ttmCapexM:ttm,quarterHistory:history,yoy,qoq,trend,
   capexDefinition,capexDefinitionLabel,currentYearGuidance:plan,forwardOutlook:future,additional,guidance,confidence,
   evidence,importedAt:new Date().toISOString(),pages:pages.length,
   notes:'기업 전체 CAPEX입니다. AI만의 투자액이 아니며 기업별 CAPEX 정의와 현금흐름표·리스 회계 차이를 확인해야 합니다.'};
 }
 async function extractPdfPages(file,onProgress){
  if(!globalThis.pdfjsLib)throw Error('PDF 분석 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하세요.');
  globalThis.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf=await globalThis.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  try{if(pdf.numPages>200)throw Error('200페이지 이하의 PDF를 선택하세요.');const pages=[];
   for(let i=1;i<=pdf.numPages;i++){const pg=await pdf.getPage(i),txt=await pg.getTextContent(),lines=groupItems(txt.items);
    pages.push({page:i,lines,text:lines.join('\n')});if(onProgress)onProgress(i,pdf.numPages);}
   return pages;
  }finally{pdf.destroy();}
 }
 return {groupItems,parseReport,extractPdfPages,yearAndQuarter,numericRow,capexCandidates,classifyGuidance,currentYearPlan,outlook};
});
