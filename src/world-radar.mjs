/**
 * Toyol World Radar: consent-respecting public job discovery.
 * Sources: Himalayas and Remotive official public APIs.
 * Metadata is untrusted. No bidding, DMs, signup or payment actions.
 *
 * Daily cadence. A successful scan means leads discovered, NOT income.
 */
import {mkdirSync,writeFileSync,appendFileSync} from 'node:fs';
import {currencyDecision} from './currency-myr.mjs';

const REPO='ilhamraduanbis-source/toyol-digital';
const ISSUE_NO=3;
const START='<!-- toyol-world-radar-v1 -->';
const END='<!-- /toyol-world-radar-v1 -->';
const queries=[
 {q:'content writer',country:'MY',employment_type:'Contractor',sort:'recent'},
 {q:'Malay',country:'MY',employment_type:'Contractor',sort:'recent'},
 {q:'data analyst',country:'MY',employment_type:'Contractor',sort:'recent'},
 {q:'curriculum',worldwide:'true',employment_type:'Contractor',sort:'recent'}
];
const remotiveCategories=['writing','data','software-dev','marketing'];
const forbidden=/(?:\bdeposit\b|\bstaking\b|\bfee to (?:apply|start|register)\b|\bpay to work\b|\bcrypto wallet\b|\bupfront payment\b|\breferral scheme\b)/i;
const useful=/(?:writer|writing|content|edit|translat|malay|bahasa|research|curricul|lesson|course|education|data|analyst|spreadsheet|excel|document|presentation|powerpoint|automation|qa|testing|developer|coding|software)/i;
const short=(x,n=160)=>String(x??'').replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
function safeUrl(s){
 try{const u=new URL(String(s||''));return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}
}
function region(info){
 const raw=Array.isArray(info)?info.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' '):String(info||'');
 if(/\b(malaysia|malaysian)\b/i.test(raw))return 'MALAYSIA_INCLUDED';
 if(/\b(worldwide|global|anywhere|any location)\b/i.test(raw))return 'WORLDWIDE_CLAIM';
 if(/(?:us only|usa only|united states only|europe only|eu only|north america only|canada only|uk only)/i.test(raw))return 'LOCATION_RESTRICTED';
 return 'LOCATION_NEEDS_VERIFICATION';
}
export function normalizeHimalayas(job){
 const title=short(job?.title,145);
 const url=safeUrl(job?.applicationLink||job?.guid);
 const source=safeUrl(job?.guid)||'https://himalayas.app/jobs';
 const employment=short(job?.employmentType||job?.employment_type||'',45);
 const amount=Number(job?.minSalary);
 const currency=short(job?.currency||'',8).toUpperCase();
 return {
  id:'himalayas:'+short(job?.guid||url,260),title,
  company:short(job?.companyName||'',90),
  url,source_url:source,source:'Himalayas',
  employment,region:region(job?.locationRestrictions||job?.location||''),
  location_claim:short(job?.locationRestrictions||job?.location||'',130),
  pay: Number.isFinite(amount)&&amount>0&&currency?
   {minimum:amount,maximum:Number.isFinite(Number(job?.maxSalary))?Number(job.maxSalary):null,
    currency,period:short(job?.salaryPeriod||'UNVERIFIED',22)}:null,
  description:short(job?.description,400)
 };
}
export function normalizeRemotive(job){
 const title=short(job?.title,145);
 const url=safeUrl(job?.url);
 const employment=short(job?.job_type||'',45);
 return {
  id:'remotive:'+short(job?.id||url,240),title,
  company:short(job?.company_name||'',90),
  url,source_url:url,source:'Remotive',
  employment,region:region(job?.candidate_required_location||''),
  location_claim:short(job?.candidate_required_location||'',130),
  pay:null,pay_description:short(job?.salary,95),
  description:short(job?.description?.replace(/<[^>]*>/g,' '),400)
 };
}
export function normalizeLever(job){
 const title=short(job?.text,145),url=safeUrl(job?.hostedUrl);
 const location=String(job?.categories?.location||'');
 const scope=job?.descriptionPlain||job?.description||'';
 return {
  id:'lever:rws:'+short(job?.id,150),
  title,company:'RWS TrainAI',
  url,source_url:url,source:'RWS via Lever',
  employment:short(job?.categories?.commitment||'Contract',45),
  region:/(?:malaysia|johor bahru|kuala lumpur|shah alam|petaling jaya|melaka|ipoh)/i.test(location)?'MALAYSIA_INCLUDED':region(location),
  location_claim:short(location,130),
  pay:null,description:short(scope.replace(/<[^>]*>/g,' '),400)
 };
}
export function assessLead(x){
 if(!x?.url||!x.title||!useful.test(x.title+' '+x.description))return null;
 if(forbidden.test(x.title+' '+x.description))return null;
 if(x.region==='LOCATION_RESTRICTED')return null;
 // Native Chinese/Japanese/Korean/etc. fluency is not a proven Toyol capability.
 if(/(?:chinese|mandarin|cantonese|japanese|korean|german|french|spanish|bengali|tamil|telugu|hindi|portuguese|traditional chinese)/i.test(x.title))return null;
 let score=25;
 const type=x.employment.toLowerCase();
 if(/contract|freelanc|part.time|temporary/.test(type))score+=25;
 if(/full.time/.test(type))score-=30;
 if(x.region==='MALAYSIA_INCLUDED')score+=20;
 else if(x.region==='WORLDWIDE_CLAIM')score+=16;
 if(/translat|malay|bahasa|curricul|education|lesson|writer|editing|research|document|data|spreadsheet|excel|presentation|qa/.test(x.title.toLowerCase()))score+=17;
 if(/software|developer|engineering/.test(x.title.toLowerCase()))score-=15;
 if(/(?:malay|bahasa melayu|malaysia|annotation|ai data specialist|linguistic|quality reviewer)/i.test(x.title))score+=22;
 if(/\b(?:senior|principal|director|head of|lead engineer|manager)\b/i.test(x.title))score-=22;
 if(/\b(?:intern|volunteer|unpaid)\b/i.test(x.title+' '+x.employment))score-=70;
 let pay=null;
 if(x.pay&&['MYR','USD','SGD','EUR','GBP','AUD'].includes(x.pay.currency)){
  pay=currencyDecision({amount:x.pay.minimum,currency:x.pay.currency});
 }
 const eligible=x.region==='MALAYSIA_INCLUDED'||x.region==='WORLDWIDE_CLAIM';
 const taskType=/contract|freelanc/.test(type)?'CONTRACT_APPLICATION':'JOB_APPLICATION';
 return {...x,score:Math.max(0,Math.min(100,score)),task_type:taskType,
  Malaysia_eligibility:eligible?'REGION_SIGNAL_ONLY_NEEDS_EMPLOYER_CONFIRMATION':'UNVERIFIED',
  payout_myr_verified:false,
  advertised_pay_myr_estimate:pay?.illustrative_gross_myr??null,
  delivery_capability_verified:false,
  next_step:'VERIFY_TERMS_AND_CLIENT_THEN_HUMAN_APPROVAL_TO_APPLY',
  note:'External listing is not a micro-bounty, work order, accepted contract or earned money.'};
}
export function selectLeads(leads,cap=8){
 const seen=new Set();
 return leads.map(assessLead).filter(Boolean)
  .sort((a,b)=>b.score-a.score||a.source.localeCompare(b.source))
  .filter(x=>{if(seen.has(x.url))return false;seen.add(x.url);return true;})
  .slice(0,Math.max(1,Math.min(12,Math.floor(cap)||1)));
}
export function makeReport(data){
 const lines=[
  '## World Radar — peluang kerja luar GitHub','',
  '**Status: LEADS ONLY. RM0 income verified.**','',
  'Sumber API rasmi: [Himalayas](https://himalayas.app/api) dan [Remotive](https://remotive.com/remote-jobs/api).',
  'Tiada pembidaan, permohonan, penyamaran, yuran, atau pemprosesan wang dibuat.','',
  '**Penting:** jawatan kontrak/remote bukan bermaksud kerja mikro boleh dilaksanakan oleh ejen AI. Kelayakan Malaysia, penerimaan kerja dan saluran bayaran wajib disahkan.',''
 ];
 for(const s of data.sources)lines.push('- '+s.name+': '+s.status+' ('+s.count+' rekod)',...(s.error?['  - Ralat: '+short(s.error,75)]:[]));
 lines.push('','### Calon untuk disemak','');
 if(!data.leads.length)lines.push('Tiada calon yang melepasi saringan dalam sampel ini.','');
 for(const x of data.leads){
  lines.push('- **'+short(x.title,110).replace(/[[\]*]/g,'')+'** — '+short(x.company,70)+
   ' ([lihat peluang]('+x.url+'))', '  - Sumber: ['+x.source+']('+x.source_url+')'+
   ' | Jenis: '+(x.employment||'unspecified')+' | Geografi: '+x.region+
   ' | Skor saringan: '+x.score+'/100'+
   ' | MYR boleh dikeluarkan: **belum disahkan**');
 }
 lines.push('','Penilaian skor bukan kebarangkalian berjaya, kadar gaji bersih atau bukti pembayaran.');
 return lines.join('\n')+'\n';
}
async function json(url){
 const u=new URL(url);
 if(!(u.hostname==='himalayas.app'||u.hostname==='remotive.com'||u.hostname==='api.lever.co'))throw Error('source not allowed');
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),14000);
 try{
  const res=await fetch(u,{signal:ac.signal,headers:{Accept:'application/json','User-Agent':'ToyolWorldRadar/1.0 (public API; once daily)'}});
  if(!res.ok)throw Error('HTTP '+res.status);
  const text=await res.text();
  if(text.length>3_000_000)throw Error('response too large');
  return JSON.parse(text);
 }finally{clearTimeout(timer);}
}
export async function scanSources(fetchJSON=json){
 const sources=[],records=[];
 // At most four searches in Himalayas daily. Partial failure never masquerades as a clean zero.
 for(const params of queries){
  const url='https://himalayas.app/jobs/api/search?'+new URLSearchParams(params);
  try{
   const data=await fetchJSON(url);
   const jobs=Array.isArray(data.jobs)?data.jobs:Array.isArray(data.data)?data.data:[];
   const normalized=jobs.slice(0,20).map(normalizeHimalayas);
   records.push(...normalized);
   sources.push({name:'Himalayas '+params.q,status:'OK',count:jobs.length});
  }catch(e){sources.push({name:'Himalayas '+params.q,status:'ERROR',count:0,error:String(e?.message||e)});}
 }
 // Remotive advises at most four API requests per day and attributes all links.
 for(const category of remotiveCategories){
  const url='https://remotive.com/api/remote-jobs?category='+encodeURIComponent(category)+'&limit=40';
  try{
   const data=await fetchJSON(url);
   const jobs=Array.isArray(data.jobs)?data.jobs:[];
   records.push(...jobs.slice(0,40).map(normalizeRemotive));
   sources.push({name:'Remotive '+category,status:'OK',count:jobs.length});
  }catch(e){sources.push({name:'Remotive '+category,status:'ERROR',count:0,error:String(e?.message||e)});}
 }
 try{
  const data=await fetchJSON('https://api.lever.co/v0/postings/rws?mode=json&limit=200');
  if(!Array.isArray(data))throw Error('unexpected Lever response');
  const malay=data.filter(j=>/\bmalay\b/i.test(String(j?.text||'')) &&
   /(?:remote|malaysia|johor|kuala lumpur)/i.test(String(j?.categories?.location||'')+' '+String(j?.workplaceType||'')));
  records.push(...malay.slice(0,20).map(normalizeLever));
  sources.push({name:'RWS official Lever Malay roles',status:'OK',count:malay.length});
 }catch(e){sources.push({name:'RWS official Lever Malay roles',status:'ERROR',count:0,error:String(e?.message||e)});}
 return {scanned_at:new Date().toISOString(),sources,
  input_records:records.length,leads:selectLeads(records,8),
  verified_paid_engagements:0,verified_received_myr:0};
}
async function publish(text,token){
 if(!token||process.env.GITHUB_REPOSITORY!==REPO)return {saved:false,reason:'NO_AUTH'};
 const root='https://api.github.com/repos/'+REPO+'/issues/'+ISSUE_NO;
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json'};
 const old=await fetch(root,{headers});
 if(!old.ok)throw Error('issue read HTTP '+old.status);
 const issue=await old.json();
 if(!String(issue.title||'').startsWith('🌐 Toyol World Radar'))throw Error('unexpected issue');
 const body=String(issue.body||'');
 const start=body.indexOf(START),end=body.indexOf(END,start+START.length);
 const fragment=START+'\n'+text+'\n'+END;
 const next=start>=0&&end>start?body.slice(0,start)+fragment+body.slice(end+END.length):
  body+'\n'+fragment;
 const r=await fetch(root,{method:'PATCH',headers,body:JSON.stringify({body:next})});
 if(!r.ok)throw Error('issue update HTTP '+r.status);
 return {saved:true,url:'https://github.com/'+REPO+'/issues/'+ISSUE_NO};
}
export async function main({scan=scanSources,publishReport=publish}={}){
 const data=await scan(),report=makeReport(data);
 mkdirSync('out/world',{recursive:true});
 writeFileSync('out/world/radar.json',JSON.stringify(data,null,2));
 writeFileSync('out/world/radar.md',report);
 console.log(report);
 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,report);
 try{data.publication=await publishReport(report,process.env.GITHUB_TOKEN);}
 catch(e){data.publication={saved:false,reason:short(e?.message,90)};}
 writeFileSync('out/world/radar.json',JSON.stringify(data,null,2));
 return data;
}
if(process.argv[1]?.endsWith('world-radar.mjs'))main().catch(e=>{console.error(e);process.exitCode=1;});
