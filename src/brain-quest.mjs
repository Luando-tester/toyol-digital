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
import {evaluate} from './quest-intel.mjs';

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
export function rankFilePaths(paths,title,body=''){
 return rankEvidence(paths,title,body).map(x=>x.path);
}
async function attempt(url){
 const m=ISSUE_RE.exec(url);
 if(!m)throw Error('invalid GitHub issue URL');
 const apiRoot='/repos/'+m[1]+'/'+m[2];
 const [repo,issue]=await Promise.all([api(apiRoot),api(apiRoot+'/issues/'+m[3])]);
 if(repo.private||repo.archived||repo.disabled||repo.size>25000)throw Error('repository excluded');
 if(issue.comments>15)throw Error('issue heavily contested');
 const comments=issue.comments?await api(apiRoot+'/issues/'+m[3]+'/comments?per_page=50'):[];
 const verdict=evaluate(issue,comments,repo);
 if(!verdict.pass)throw Error('issue rejected: '+verdict.reasons.slice(0,3).join(', '));
 const pulls=await api(apiRoot+'/pulls?state=open&per_page=100');
 if(!Array.isArray(pulls))throw Error('cannot verify competing PRs');
 if(pulls.some(p=>new RegExp('#'+m[3]+'\\b|/issues/'+m[3]+'\\b','i').test((p.body||'')+' '+(p.title||''))))throw Error('competing pull request');
 const work=mkdtempSync(join(tmpdir(),'toyol-ai-quest-'));
 try{
  const root=join(work,'source');
  git(['clone','--quiet','--depth','1','--','https://github.com/'+m[1]+'/'+m[2]+'.git',root],work);
  const names=git(['ls-files'],root).split('\n').filter(Boolean);
  const choice=chooseEvidence(names,issue.title,issue.body||'');
  if(!choice.paths.length)throw Error('no issue-relevant editable source; abstaining');
  const chosen=[];
  for(const path of choice.paths){
   if(chosen.length>=5)break;
   try{if(statSync(join(root,path)).size<=6000)chosen.push(path);}catch{}
  }
  if(!chosen.length)throw Error('no small readable source files');
  const context=collectContext(root,chosen);
  const description=(issue.title+'\n'+String(issue.body||'').slice(0,1350)).slice(0,1600);
  const proposal=await queryLocalModel(makeMessages(description,context));
  if(proposal.edits.length===0)throw Error('model declined uncertain task');
  const result=applyProposal(root,context,proposal);
  const patch=collectPatch(root);
  if(patch.length>18000||!patch.startsWith('diff --git '))throw Error('invalid large diff');
  mkdirSync('out/brain',{recursive:true});
  writeFileSync('out/brain/quest-draft.patch',patch+'\n');
  return {
   status:'AI_DRAFT_CREATED_NOT_SUBMITTED',issue:url,
   repo:m[1]+'/'+m[2],edited_files:result.files,
   checks:result.validation,sha256:createHash('sha256').update(patch).digest('hex'),
   not_verified:['full project tests','maintainer acceptance','platform payout','automation permitted by bounty terms'],
   earned_amount_verified:0
  };
 }finally{rmSync(work,{recursive:true,force:true});}
}
export async function main({getIssue=()=>api('/repos/'+REPO+'/issues/1'),runAttempt=attempt}={}){
 mkdirSync('out/brain',{recursive:true});
 const manifest={
  status:'NO_ELIGIBLE_REAL_QUEST',sampled_quest_count:0,
  evaluated:[],earned_amount_verified:0,external_bounty_accepted:false
 };
 try{
  const board=await getIssue();
  const urls=questUrls(board.body).slice(0,MAX_TRIES);
  manifest.sampled_quest_count=urls.length;
  for(const url of urls){
   try{
    const result=await runAttempt(url);
    Object.assign(manifest,result);
    break;
   }catch(err){manifest.evaluated.push({url,result:'SKIPPED',reason:String(err.message).slice(0,190)});}
  }
 }catch(e){manifest.status='QUEST_SOURCE_UNAVAILABLE';manifest.error=String(e.message).slice(0,130);}
 writeFileSync('out/brain/quest-evidence.json',JSON.stringify(manifest,null,2));
 console.log('Toyol AI quest bridge:',manifest.status,'; candidates:',manifest.sampled_quest_count,'; earned RM0');
 for(const item of manifest.evaluated.slice(0,5))console.log('Rejected',item.url,':',item.reason);
 if(process.env.GITHUB_STEP_SUMMARY){
  const lines=['## AI Quest Draft (local model)','',
    '- Candidates checked: **'+manifest.sampled_quest_count+'**',
    '- Final result: **'+manifest.status+'**',
    '- Real submissions: **0** | Accepted jobs: **0** | Verified earnings: **RM0**','',''];
  for(const x of manifest.evaluated.slice(0,5))lines.push('- '+x.url+' — '+x.reason);
  lines.push('','Local-model drafts are not proof of payment or permission to send work.');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n','utf8');
 }
 return manifest;
}
if(process.argv[1]?.endsWith('brain-quest.mjs'))main().catch(e=>{console.error(e.message);process.exitCode=1;});
