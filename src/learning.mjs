/**
 * Durable learning ledger. Stores observed attempt categories and decisions
 * in Toyol's own GitHub issue, NOT raw model prompts, secrets, or payout claims.
 * Does not retrain Qwen model weights; it adjusts future screening priorities.
 */
const REPO='ilhamraduanbis-source/toyol-digital';
const ISSUE=2;
const HEADER='<!-- toyol-learning-v1 -->';
const FOOTER='<!-- /toyol-learning-v1 -->';
const URL=/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/[1-9]\d*$/;
const KINDS=new Set(['REPAIRABLE_MODEL_OUTPUT','UNCLASSIFIED','TRANSIENT_INFRA','VERIFY_FIRST','HARD_STOP','COMPETITION_TO_ANALYZE']);
const OUTCOMES=new Set(['NOT_SOLVED','LOCAL_DRAFT','EVALUATED']);
export const emptyLedger=()=>({version:1,runs:[]});

export function parseLedger(body){
 const text=String(body||'');
 const start=text.indexOf(HEADER);
 const end=text.indexOf(FOOTER,start+HEADER.length);
 if(start<0||end<0)return emptyLedger();
 let parsed;
 try{parsed=JSON.parse(text.slice(start+HEADER.length,end).trim());}catch{return emptyLedger();}
 if(parsed?.version!==1||!Array.isArray(parsed.runs))return emptyLedger();
 return {version:1,runs:parsed.runs.slice(-35).filter(x=>Number.isInteger(x.run)&&x.run>0&&URL.test(x.url||'')&&OUTCOMES.has(x.outcome)&&KINDS.has(x.category))};
}
export function serializeLedger(body,ledger){
 const json=JSON.stringify({version:1,runs:ledger.runs.slice(-35)},null,2);
 const section=HEADER+'\n'+json+'\n'+FOOTER;
 const text=String(body||'');
 const start=text.indexOf(HEADER),end=text.indexOf(FOOTER,start+HEADER.length);
 return start<0||end<0?text.trimEnd()+'\n\n'+section:
  text.slice(0,start)+section+text.slice(end+FOOTER.length);
}
export function recordLearning(ledger,manifest,run=1){
 const n=Number(run);
 if(!Number.isInteger(n)||n<1)throw Error('invalid run number');
 const base=parseLedger(serializeLedger('',ledger));
 const events=[];
 for(const item of (manifest?.evaluated||[]).slice(0,10)){
  if(!URL.test(item.url||''))continue;
  const category=KINDS.has(item.category)?item.category:'UNCLASSIFIED';
  events.push({run:n,url:item.url,outcome:'NOT_SOLVED',category,
   attempt_count:Math.max(0,Math.min(2,Number(item.attempts?.length||0)))});
 }
 if(manifest?.status==='AI_DRAFT_CREATED_NOT_SUBMITTED'&&URL.test(manifest.issue||'')){
  events.push({run:n,url:manifest.issue,outcome:'LOCAL_DRAFT',category:'UNCLASSIFIED',
   attempt_count:Math.max(1,Math.min(2,Number(manifest.attempts?.length||1)))});
 }
 const previous=base.runs.filter(x=>x.run!==n);
 const known=new Set(previous.map(x=>x.run+'|'+x.url));
 for(const e of events)if(!known.has(e.run+'|'+e.url)){previous.push(e);known.add(e.run+'|'+e.url);}
 return {version:1,runs:previous.slice(-35)};
}
export function learningAdvice(url,ledger){
 if(!URL.test(url||''))return {stage:'INVALID',priority_adjustment:0,reason:'invalid issue URL'};
 const last=(ledger?.runs||[]).filter(x=>x.url===url).slice(-5);
 const failed=last.filter(x=>x.outcome==='NOT_SOLVED');
 const drafted=last.filter(x=>x.outcome==='LOCAL_DRAFT');
 const modelFailures=failed.filter(x=>x.category==='REPAIRABLE_MODEL_OUTPUT').length;
 const transient=failed.filter(x=>x.category==='TRANSIENT_INFRA').length;
 const blocked=failed.filter(x=>x.category==='HARD_STOP').length;
 const latest=last.at(-1);
 const stage=latest?.outcome==='LOCAL_DRAFT'?'REVIEW_EXISTING_DRAFT':
  blocked?'REVERIFY_ELIGIBILITY':
  modelFailures>=2?'CHANGE_DIAGNOSIS':
  transient?'RETRY_AFTER_INFRA_RECOVERY':
  failed.length>=2?'ROTATE_AND_GATHER_NEW_EVIDENCE':
  'EXPLORE_OR_COMPETE';
 const priority_adjustment=stage==='CHANGE_DIAGNOSIS'?-20:
  stage==='REVIEW_EXISTING_DRAFT'?-15:
  stage==='REVERIFY_ELIGIBILITY'?-15:
  stage==='ROTATE_AND_GATHER_NEW_EVIDENCE'?-10:0;
 return {stage,priority_adjustment,observed_attempts:last.length,
  observed_model_failures:modelFailures,prior_drafts:drafted.length,
  reason:stage==='CHANGE_DIAGNOSIS'?'Repeated same model error; change evidence/approach before spending more inference':
   stage==='REVIEW_EXISTING_DRAFT'?'Review local draft before spending compute again':
   stage==='REVERIFY_ELIGIBILITY'?'Check original terms and status, not competitive pressure':
   stage==='ROTATE_AND_GATHER_NEW_EVIDENCE'?'Collect different evidence or explore another candidate':
   stage==='RETRY_AFTER_INFRA_RECOVERY'?'Temporary failure; later run may recheck':'No recorded blocker'};
}
export function rankWithMemory(prioritized,ledger,limit=5){
 return prioritized.map(x=>({...x,learning:learningAdvice(x.issue_url,ledger)}))
  .sort((a,b)=>(b.review_priority_points+b.learning.priority_adjustment)-
   (a.review_priority_points+a.learning.priority_adjustment)||a.issue_url.localeCompare(b.issue_url))
  .slice(0,Math.max(1,Math.min(5,Math.floor(limit)||1)));
}
async function githubIssue(token,method='GET',body=null){
 const controller=new AbortController(),stop=setTimeout(()=>controller.abort(),12000);
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
 if(body!==null)headers['Content-Type']='application/json';
 try{
  const res=await fetch('https://api.github.com/repos/'+REPO+'/issues/'+ISSUE,{
   method,headers,signal:controller.signal,...(body!==null?{body:JSON.stringify(body)}:{})
  });
  if(!res.ok)throw Error('learning ledger HTTP '+res.status);
  return res.json();
 }finally{clearTimeout(stop);}
}
export async function loadLearning(token=process.env.GITHUB_TOKEN){
 if(!token||process.env.GITHUB_REPOSITORY!==REPO)return {ledger:emptyLedger(),source:'NO_AUTH'};
 try{
  const issue=await githubIssue(token);
  if(!String(issue.title||'').startsWith('🧠 Toyol Learning Ledger'))return {ledger:emptyLedger(),source:'WRONG_ISSUE'};
  return {ledger:parseLedger(issue.body),source:'GITHUB_ISSUE_2'};
 }catch{return {ledger:emptyLedger(),source:'UNAVAILABLE'};}
}
export async function saveLearning(ledger,token=process.env.GITHUB_TOKEN){
 if(!token||process.env.GITHUB_REPOSITORY!==REPO)return {saved:false,reason:'NO_AUTH'};
 const issue=await githubIssue(token);
 if(!String(issue.title||'').startsWith('🧠 Toyol Learning Ledger'))return {saved:false,reason:'WRONG_ISSUE'};
 await githubIssue(token,'PATCH',{body:serializeLedger(issue.body,ledger)});
 return {saved:true,events:ledger.runs.length};
}
