/**
 * Toyol Resilience Engine: recover from a bad first attempt, not from a ban.
 *
 * Bounded attempts, evidence-based feedback, no third-party submissions.
 * "Resilient" is not permission to ignore a maintainer or payment terms.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {makeMessages,applyProposal,safeFile} from './brain-core.mjs';

const MAX_ATTEMPTS=2;
const MAX_FEEDBACK=260;
const clean=x=>String(x??'').replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').slice(0,MAX_FEEDBACK);
const hard=/^(?:quest REJECT:|issue closed|issue locked|repository excluded|invalid GitHub issue URL|unsafe (?:path|source|edit|file)|file not in approved context|forbidden|human[- ]only|deposit required)/i;
const verify=/^(?:quest VERIFY_FIRST:|reward not independently visible|platform terms|eligibility unverified)/i;
const retryable=/search is absent or nonunique|non-JSON model answer|invalid edits schema|invalid edit keys|invalid model output|JavaScript syntax check failed|Python AST check failed|JSON parse failed|syntax check failed|suspicious or empty edit|no bounded edits|model declined uncertain task|patch missing or oversized/i;

export function classifySetback(reason){
 const message=clean(reason?.message??reason);
 if(hard.test(message))return {type:'HARD_STOP',retry:false,advice:'Respect eligibility and safety restrictions'};
 if(verify.test(message))return {type:'VERIFY_FIRST',retry:false,advice:'Obtain authoritative eligibility evidence'};
 if(retryable.test(message))return {type:'REPAIRABLE_MODEL_OUTPUT',retry:true,advice:'Propose a different exact minimal edit using the provided original source'};
 if(/rate limit|429|HTTP 5\d\d|ETIMEDOUT|ECONNRESET|fetch failed|AbortError|timeout/i.test(message))
  return {type:'TRANSIENT_INFRA',retry:false,advice:'Leave candidate for a later scheduled run; do not hammer an API'};
 if(/competi|claimed|discussion|pull request/i.test(message))
  return {type:'COMPETITION_TO_ANALYZE',retry:false,advice:'Compare competing work against acceptance criteria, not comment volume'};
 return {type:'UNCLASSIFIED',retry:false,advice:'Do not fabricate a successful fix'};
}
export function recoveryFeedback(error){
 const verdict=classifySetback(error);
 return 'The previous attempt was not accepted by the local patch validator: '+clean(error?.message??error)+
  '. '+verdict.advice+'. Work against the ORIGINAL FILE contents supplied above. '+
  'Quote one uniquely occurring source span exactly, do not edit tests, and emit only the required JSON.';
}
function restoreEditable(root,context){
 for(const [path,contents] of Object.entries(context)){
  if(safeFile(path))writeFileSync(resolve(root,path),contents,'utf8');
 }
}
export async function recoverPatch({
 root,context,task,model,validate=()=>({}),maxAttempts=MAX_ATTEMPTS
}){
 const attempts=[];
 const limit=Math.min(MAX_ATTEMPTS,Math.max(1,Math.floor(maxAttempts)||1));
 let feedback='';
 for(let n=1;n<=limit;n++){
  restoreEditable(root,context);
  const messages=makeMessages(task,context);
  if(feedback)messages.push({role:'user',content:feedback});
  try{
   const proposal=await model(messages);
   if(!proposal?.edits?.length)throw Error('model declined uncertain task');
   const patch=applyProposal(root,context,proposal);
   const extra=await validate(patch,root);
   attempts.push({attempt:n,status:'PATCH_VALIDATED',files:patch.files});
   return {patch,...extra,attempts,recovery_used:n>1};
  }catch(e){
   const decision=classifySetback(e);
   attempts.push({attempt:n,status:'FAILED',failure_type:decision.type,
    reason:clean(e?.message??e),retry_allowed:decision.retry&&n<limit});
   restoreEditable(root,context);
   if(!decision.retry||n===limit){
    const error=new Error('bounded recovery exhausted: '+clean(e?.message??e));
    error.attempts=attempts;
    error.category=decision.type;
    throw error;
   }
   feedback=recoveryFeedback(e);
  }
 }
 throw Error('unreachable recovery state');
}
export function resilienceSummary(attempts=[]){
 const list=Array.isArray(attempts)?attempts:[];
 return {attempts:list.length,recoveries:list.filter(x=>x.attempt>1).length,
   failures:list.filter(x=>x.status==='FAILED').length,
   completed:list.some(x=>x.status==='PATCH_VALIDATED'),
   note:'Local patch validation is not independent project tests, bounty acceptance, or income.'};
}
