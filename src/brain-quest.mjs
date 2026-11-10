/**
 * Toyol AI Quest Bridge — tries one real, publicly listed bounty as a draft.
 * Does not claim, comment on, submit PRs to, or interact financially with
 * third-party services. A locally generated diff is NOT completed paid work.
 */
import {mkdtempSync,mkdirSync,rmSync,writeFileSync,readFileSync,statSync,appendFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,basename} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {collectContext,makeMessages,queryLocalModel,applyProposal} from './brain-core.mjs';
import {rankEvidence,chooseEvidence} from './context-rank.mjs';
import {collectPatch} from './worker.mjs';
import {decideQuest,qualityEvidence} from './competency.mjs';
import {recoverPatch,resilienceSummary,classifySetback} from './resilience.mjs';
import {valueAssessment} from './opportunity.mjs';
import {understandSituation,chooseBoardOpportunities,composeRepairTask} from './situation.mjs';
import {loadLearning,saveLearning,recordLearning,emptyLedger} from './learning.mjs';
import {investigateRivals,contrastPatch} from './rival.mjs';
import {findSourceBySymbols} from './symbol-search.mjs';
import {enforcePatchRequirements} from './semantic-check.mjs';

const REPO='ilhamraduanbis-source/toyol-digital';
const ISSUE_RE=/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/issues\/([1-9]\d*)$/;
const MAX_TRIES=5;
const summary=[];

function git(args,cwd){
 return execFileSync('git',args,{cwd,encoding:'utf8',timeout:35000,maxBuffer:5*1024*1024,
   env:{...process.env,GITHUB_TOKEN:'',GH_TOKEN:'',GIT_TERMINAL_PROMPT:'0'}}).trim();
}
async function api(path){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch('https://api.github.com'+path,{
   signal:controller.signal,headers:{Accept:'application/vnd.github+json','User-Agent':'ToyolAIQuestBridge/0.1'}
  });
  if(!response.ok)throw Error('Public GitHub API HTTP '+response.status);
  return response.json();
 }finally{clearTimeout(timeout);}
}
export function questUrls(text){
 const matches=String(text||'').matchAll(/- Sumber asal: (https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/[1-9]\d*)/g);
 return [...new Set([...matches].map(x=>x[1]))].slice(0,12);
}
export function chooseQuestBatch(urls,runNumber=1,limit=MAX_TRIES){
 const unique=[...new Set((Array.isArray(urls)?urls:[]).filter(x=>ISSUE_RE.test(x)))];
 if(!unique.length)return [];
 const n=Number.isFinite(Number(runNumber))?Math.max(1,Math.floor(Number(runNumber))):1;
 const cap=Math.max(1,Math.min(MAX_TRIES,Math.floor(limit)||1));
 const offset=((n-1)*cap)%unique.length;
 return Array.from({length:Math.min(cap,unique.length)},(_,i)=>unique[(offset+i)%unique.length]);
}
export function rankFilePaths(paths,title,body=''){
 return rankEvidence(paths,title,body).map(x=>x.path);
}
async function attempt(url,offer=null){
 const m=ISSUE_RE.exec(url);
 if(!m)throw Error('invalid GitHub issue URL');
 const apiRoot='/repos/'+m[1]+'/'+m[2];
 const [repo,issue]=await Promise.all([api(apiRoot),api(apiRoot+'/issues/'+m[3])]);
 if(repo.private||repo.archived||repo.disabled||repo.size>25000)throw Error('repository excluded');
 const [comments,pulls]=await Promise.all([
  issue.comments?api(apiRoot+'/issues/'+m[3]+'/comments?per_page=100'):Promise.resolve([]),
  api(apiRoot+'/pulls?state=open&per_page=100')
 ]);
 if(!Array.isArray(comments)||!Array.isArray(pulls))throw Error('cannot assess competitor evidence');
 const verdict=decideQuest(issue,comments,repo,pulls);
 if(!verdict.can_prepare_draft)throw Error('quest '+verdict.decision+': '+[...verdict.hard_blocks,...verdict.review_flags].slice(0,3).join(', '));
 const rivalEvidence=await investigateRivals(url,pulls,api,{max:2});
 const situation=understandSituation(offer,issue,verdict);
 const value=offer?valueAssessment(offer,{questDecision:verdict,effort:situation.effort}):null;
 // Lack of a callable service or required human outreach is not a code fix.
 if(situation.recommended_strategy==='ABSTAIN_OR_RESEARCH')
  throw Error('quest VERIFY_FIRST: human or external service dependency, not a safe code patch');

 const work=mkdtempSync(join(tmpdir(),'toyol-ai-quest-'));
 try{
  const root=join(work,'source');
  git(['clone','--quiet','--depth','1','--','https://github.com/'+m[1]+'/'+m[2]+'.git',root],work);
  const names=git(['ls-files'],root).split('\n').filter(Boolean);
  const choice=chooseEvidence(names,issue.title,issue.body||'');
  const symbolMatches=findSourceBySymbols(root,issue.title,issue.body||'');
  const relevant=[...new Set([...symbolMatches.paths,...choice.paths])].filter(path=>names.includes(path)).slice(0,5);
  if(!relevant.length)throw Error('no issue-relevant source or matching code symbol; investigate differently');
  const chosen=[];
  for(const path of relevant){
   if(chosen.length>=5)break;
   try{if(statSync(join(root,path)).size<=6000)chosen.push(path);}catch{}
  }
  if(!chosen.length)throw Error('no small readable source files');
  const context=collectContext(root,chosen);
  const description=composeRepairTask(issue,situation);
  const repair=await recoverPatch({
   root,context,task:description,model:queryLocalModel,maxAttempts:2,
   validate:async()=>{
    const diff=collectPatch(root);
    if(diff.length>18000||!diff.startsWith('diff --git '))throw Error('patch missing or oversized');
    const semantic=enforcePatchRequirements(issue.title,diff);
    return {diff,semantic};
   }
  });
  const result=repair.patch;
  const patch=repair.diff;
  mkdirSync('out/brain',{recursive:true});
  writeFileSync('out/brain/quest-draft.patch',patch+'\n');
  return {
   status:'AI_DRAFT_CREATED_NOT_SUBMITTED',issue:url,
   repo:m[1]+'/'+m[2],edited_files:result.files,
   competition:verdict.competition,
   competition_strategy:verdict.decision,
   situation:{problem_kind:situation.problem_kind,recommended_strategy:situation.recommended_strategy,acceptance_verified:false,proof_requirements:situation.proof_requirements},
   source_retrieval:{symbol_status:symbolMatches.status,matching_symbols:symbolMatches.matching_symbols||[],selected_paths:chosen},
   explicit_requirement_check:repair.semantic,
   economic_value:value,
   rival_evidence:rivalEvidence,
   rival_scope_contrast:contrastPatch(result.files,rivalEvidence.rivals.filter(x=>Array.isArray(x.visible_paths))),
   claimed_earnings_myr:null,
   resilience:resilienceSummary(repair.attempts),
   attempts:repair.attempts,
   competency_evidence:qualityEvidence({
    patch:true,
    syntax:result.validation.every(x=>x.result==='pass'),
    requirements:repair.semantic?.applicable===true&&repair.semantic?.passed===true,
    tests:false,
    rivalCompared:false
   }),
   checks:result.validation,sha256:createHash('sha256').update(patch).digest('hex'),
   not_verified:['independent real project behavioral tests','maintainer acceptance','platform payout','automation permitted by bounty terms','rival PR quality'],
   earned_amount_verified:0
  };
 }finally{rmSync(work,{recursive:true,force:true});}
}
export async function main({getIssue=()=>api('/repos/'+REPO+'/issues/1'),runAttempt=attempt,loadMemory=loadLearning,saveMemory=saveLearning}={}){
 mkdirSync('out/brain',{recursive:true});
 const manifest={
  status:'NO_ELIGIBLE_REAL_QUEST',sampled_quest_count:0,
  evaluated:[],earned_amount_verified:0,external_bounty_accepted:false
 };
 try{
  const board=await getIssue();
  const loaded=await loadMemory();
  const ledger=loaded?.ledger||emptyLedger();
  manifest.learning_source=loaded?.source||'UNAVAILABLE';
  const runNo=process.env.GITHUB_RUN_NUMBER||'1';
  const opportunities=chooseBoardOpportunities(board.body,ledger,runNo,MAX_TRIES);
  const choices=opportunities;
  manifest.sampled_quest_count=choices.length;
  manifest.advanced_competency_goal={benchmark:'capacity to deliver responsibly on jobs around USD200 and above',not_a_bounty_filter:true};
  if(!choices.length)manifest.status='NO_SUITABLE_QUEST_IN_BOARD';
  manifest.selection_strategy='field evidence and learning history, with a challenging opportunity slot; no USD minimum';
  manifest.opportunity_screen=opportunities.map(x=>({
   issue:x.url,priority:x.review_priority_points,effort:x.screening_effort,
   advertised_reward:x.offer?.advertised_amount,advertised_currency:x.offer?.currency,
   money_grade:x.money_grade,payout_malaysia_verified:x.Malaysia_cashout_verified,
   growth_role:x.learning_role,
   aspiration_signal:x.first_catch?.status,
   learning:x.learning?.stage
  }));
  for(const {url,offer} of choices){
   try{
    const result=await runAttempt(url,offer);
    Object.assign(manifest,result);
    break;
   }catch(err){
    const setback=classifySetback(err);
    manifest.evaluated.push({
     url,result:'NOT_SOLVED',category:err.category||setback.type,
     reason:String(err.message).slice(0,190),
     attempts:Array.isArray(err.attempts)?err.attempts:[]
    });
   }
  }
 }catch(e){manifest.status='QUEST_SOURCE_UNAVAILABLE';manifest.error=String(e.message).slice(0,130);}
 const runNo=process.env.GITHUB_RUN_NUMBER||'1';
 // Persist only public GitHub issue URLs and sanitized outcome categories.
 try{
  const stored=await loadMemory();
  const updated=recordLearning(stored?.ledger||emptyLedger(),manifest,runNo);
  const saved=await saveMemory(updated);
  manifest.learning_ledger={source:stored?.source||'UNKNOWN',saved:!!saved?.saved,events:updated.runs.length};
 }catch(e){
  manifest.learning_ledger={saved:false,reason:'learning ledger update unavailable'};
 }
 writeFileSync('out/brain/quest-evidence.json',JSON.stringify(manifest,null,2));
 console.log('Toyol AI quest bridge:',manifest.status,'; candidates:',manifest.sampled_quest_count,'; earned RM0');
 for(const item of manifest.evaluated.slice(0,5))console.log('Quest',item.category,item.url,':',item.reason);
 if(process.env.GITHUB_STEP_SUMMARY){
  const lines=['## AI Quest Draft (local model)','',
    '- Candidates checked: **'+manifest.sampled_quest_count+'**',
    '- Final result: **'+manifest.status+'**',
    '- Real submissions: **0** | Accepted jobs: **0** | Verified earnings: **RM0**','',''];
  lines.push('### Opportunity screening (advertised money is not earned)','');
  for(const x of (manifest.opportunity_screen||[]).slice(0,5)){
   lines.push('- '+x.issue+' — advertised '+x.advertised_reward+' '+x.advertised_currency+
    ' — screening '+x.priority+'/100 ('+x.effort+') — '+x.money_grade+
    ' — growth '+(x.growth_role||'UNCLASSIFIED')+' — prior result '+(x.learning||'NONE'));
  }
  lines.push('','### Real-issue attempts','');
  for(const x of manifest.evaluated.slice(0,5))lines.push('- '+x.url+' — '+(x.category||'UNVERIFIED')+' — '+x.reason+' — '+(x.attempts?.length||0)+' local attempts');
  lines.push('','Cashout MYR is not confirmed. Scores are triage heuristics, not probabilities or income forecasts.');
  lines.push('','Local-model drafts are not proof of payment or permission to send work.');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n','utf8');
 }
 return manifest;
}
if(process.argv[1]?.endsWith('brain-quest.mjs'))main().catch(e=>{console.error(e.message);process.exitCode=1;});
