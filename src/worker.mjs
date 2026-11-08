/** Toyol Stage 2: bounded real-task patch executor. No payments or PR submissions. */
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, readdirSync, statSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseInstruction, applyInstruction } from './skills.mjs';

const ISSUE=/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/issues\/([1-9]\d*)(?:[/?#].*)?$/;
const TOKEN='[A-Za-z_$][A-Za-z0-9_$]{2,59}';
const RENAME=new RegExp('^(?:\\[BOUNTY\\]\\s*)?(?:rename|replace)\\s+[\\x60\\x27]?('+TOKEN+')[\\x60\\x27]?\\s+(?:to|with)\\s+[\\x60\\x27]?('+TOKEN+')[\\x60\\x27]?\\s*$','i');
const COST=/\b(deposit|staking|stake|fund|funding|pay a fee|subscribe|referral|post on (?:reddit|x|twitter)|wallet)\b/i;
const FOLDER=new Set(['src','lib','docs','app','packages']);
const VALID=/\.(ts|tsx|js|jsx|py|md)$/i;
const IGNORE=/(^|\/)(dist|build|vendor|node_modules|coverage|generated|\.git)(\/|$)|\.min\.js$/i;
const sanitize=(x,n=160)=>String(x??'').replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,n);

export function plan(gig){
 if(!gig||!['algora','issuehunt','bountyhub','opire'].includes(gig.source))return null;
 if(!['USD','USDC'].includes(gig.currency)||!(Number(gig.amount)>0)||COST.test(gig.title+' '+gig.summary))return null;
 const url=ISSUE.exec(gig.url||'');const skill=parseInstruction(gig.title,gig.summary);
 if(!url||!skill)return null;
 return {owner:url[1],repo:url[2],num:Number(url[3]),url:gig.url,skill,title:gig.title,amount:gig.amount,currency:gig.currency};
}
export function transform(text,oldName,newName){
 let n=0;
 const pattern=new RegExp('(?<![A-Za-z0-9_$])'+oldName.replace(/\$/g,'\\$')+'(?![A-Za-z0-9_$])','g');
 const content=text.replace(pattern,()=>{n++;return newName;});
 return {content,n};
}
function listFiles(root,dir=root,depth=0){
 if(depth>9)return [];
 let files=[];
 for(const entry of readdirSync(dir,{withFileTypes:true})){
  if(entry.isSymbolicLink())continue;
  const path=join(dir,entry.name),p=relative(root,path).replaceAll('\\','/');
  if(IGNORE.test(p))continue;
  if(entry.isDirectory()){
   if(depth===0&&!FOLDER.has(entry.name))continue;
   files.push(...listFiles(root,path,depth+1));
  }else if(entry.isFile()&&VALID.test(p)&&statSync(path).size<100000)files.push(path);
  if(files.length>300)break;
 }
 return files.slice(0,300);
}
export function solveFolder(root,oldName,newName){
 const changes=[];
 for(const file of listFiles(root)){
  const before=readFileSync(file,'utf8');
  if(before.includes('\u0000')||before.includes('\uFFFD'))continue;
  const after=transform(before,oldName,newName);
  if(after.n)changes.push({file,after,path:relative(root,file)});
  if(changes.length>4)throw Error('too many files');
 }
 const count=changes.reduce((a,c)=>a+c.after.n,0);
 if(count<1||count>15)throw Error('no safe small fix');
 for(const change of changes)writeFileSync(change.file,change.after.content);
 return {count,files:changes.map(c=>c.path)};
}
function git(args,cwd){return execFileSync('git',args,{cwd,encoding:'utf8',timeout:30000,env:{...process.env,GH_TOKEN:'',GITHUB_TOKEN:'',GIT_TERMINAL_PROMPT:'0'}}).trim();}
export function collectPatch(root){
 git(['diff','--check'],root);
 const diff=git(['diff','--','README.md','src','lib','docs','app','packages'],root);
 if(!diff.startsWith('diff --git ')||diff.length>100000)throw Error('invalid patch');
 return diff;
}
async function source(url){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
 try{
  const r=await fetch(url,{signal:ctrl.signal,headers:{Accept:'application/vnd.github+json','User-Agent':'toyol-stage2/0.2',...(process.env.GITHUB_TOKEN?{Authorization:'Bearer '+process.env.GITHUB_TOKEN}:{})}});
  if(!r.ok)throw Error('source API '+r.status);
  return r.json();
 }finally{clearTimeout(timer);}
}
export async function execute(task){
 const api='https://api.github.com/repos/'+task.owner+'/'+task.repo;
 const [repo,issue]=await Promise.all([source(api),source(api+'/issues/'+task.num)]);
 if(repo.private||repo.archived||repo.size>25000)throw Error('repo excluded');
 if(issue.state!=='open'||issue.comments>30||issue.locked||issue.assignee||issue.assignees?.length)throw Error('contested / closed issue');
 if(issue.title.trim().toLowerCase()!==task.title.trim().toLowerCase())throw Error('source title mismatch');
 if(!issue.labels?.some(l=>/bounty|reward|paid/i.test(l.name)))throw Error('no reward label');
 if(COST.test(issue.body||''))throw Error('issue requires costs');
 // Examine explicit competing claims and existing pull requests before doing work.
 const [comments, pulls]=await Promise.all([
   issue.comments ? source(api+'/issues/'+task.num+'/comments?per_page=100') : Promise.resolve([]),
   source(api+'/pulls?state=open&per_page=100')
 ]);
 if(!Array.isArray(comments)||!Array.isArray(pulls))throw Error('competition cannot be verified');
 if(comments.some(c=>/\/(?:claim|attempt)\b|\b(?:working on|already submitted|claimed by|claiming this)\b|\/pull\/\d+/i.test(String(c.body||''))))throw Error('another contributor has claimed or attempted issue');
 const issueRef=new RegExp('(?:#'+task.num+'\\b|/issues/'+task.num+'\\b)','i');
 if(pulls.some(p=>issueRef.test(String(p.title||'')+' '+String(p.body||''))))throw Error('competing pull request exists');

 const tmp=mkdtempSync(join(tmpdir(),'toyol-work-'));
 try{
  const root=join(tmp,'repo');
  git(['clone','--quiet','--depth','1','--','https://github.com/'+task.owner+'/'+task.repo+'.git',root],tmp);
  const solved=applyInstruction(root,task.skill);
  const diff=collectPatch(root);
  mkdirSync('out/stage2',{recursive:true});
  writeFileSync('out/stage2/solution.patch',diff+'\n');
  const manifest={status:'PATCH_PREPARED_NOT_SUBMITTED',issue:task.url,advertised_reward:task.amount+' '+task.currency,files:solved.files,replacements:solved.count,skill:solved.skill,patch_sha256:createHash('sha256').update(diff).digest('hex'),checks:['issue open and bounty-labelled','no assigned party or high comment count','git diff --check'],not_verified:['project test suite','maintainer acceptance','payout'],created_at:new Date().toISOString()};
  writeFileSync('out/stage2/manifest.json',JSON.stringify(manifest,null,2));
  return manifest;
 }finally{rmSync(tmp,{recursive:true,force:true});}
}
export async function main(){
 const feed=JSON.parse(readFileSync('out/feed.json','utf8'));
 const {shortlist}=await import('./toyol.mjs');
 const tasks=shortlist(feed.items,1000).map(plan).filter(Boolean).slice(0,6);
 let message='## Toyol Stage 2 — bounded problem solving\n';
 let result=null;const failures=[];
 for(const t of tasks){
   try{result=await execute(t);break;}
   catch(e){failures.push({url:t.url,reason:sanitize(e.message,100)});console.log('Skipped '+t.url+': '+sanitize(e.message));}
 }
 mkdirSync('out/stage2',{recursive:true});
 writeFileSync('out/stage2/scan-result.json',JSON.stringify({checked:tasks.length,found:!!result,failures,issue:result?.issue||null,earned_amount:0},null,2));
 if(result)message+='A bounded source patch was prepared for '+result.issue+'. **Not submitted, accepted or paid.** See Stage 2 run artifact.\n';
 else message+='Inspected '+tasks.length+' eligible instruction(s). No verified patch produced. No external submission or income.\n';
 console.log(message);
 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,message);
 return result;
}
if(process.argv[1]?.endsWith('worker.mjs'))main().catch(e=>{console.error(e.message);process.exitCode=1;});
