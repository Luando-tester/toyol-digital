/**
 * Toyol Quest Intelligence — read-only GitHub issue due diligence.
 * A bounty listing is not payment proof or permission to auto-submit.
 * Never sends comments, claims, PRs, network payments, or writes to third-party repos.
 */
import {readFileSync,mkdirSync,writeFileSync,appendFileSync} from 'node:fs';
import {parseGig,shortlist} from './toyol.mjs';
import {decideQuest} from './competency.mjs';
const issueLink=/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/issues\/([1-9]\d*)(?:[?#].*)?$/;
const boards=new Set(['algora','bountyhub','issuehunt','opire']);
export function evaluate(issue,comments=[],repo={},now=Date.now(),pulls=[]){
 const result=decideQuest(issue,comments,repo,pulls,now);
 return {
  pass:result.can_prepare_draft,
  reasons:[...result.hard_blocks,...result.review_flags],
  decision:result.decision,
  competition:result.competition,
  next_evidence:result.next_evidence
 };
}
async function getGitHub(path,token){
 const ac=new AbortController();const timer=setTimeout(()=>ac.abort(),10000);
 try{
  const r=await fetch('https://api.github.com'+path,{
   signal:ac.signal,
   headers:{Accept:'application/vnd.github+json','User-Agent':'ToyolQuestIntel/1.0',
    ...(token?{Authorization:'Bearer '+token}:{})}
  });
  if(!r.ok)throw Error('GitHub API HTTP '+r.status);
  return await r.json();
 }finally{clearTimeout(timer);}
}
export function sampleTasks(items,limit=4){
 return shortlist(items,1000).filter(x=>boards.has(x.source)&&issueLink.test(x.url))
   .sort((a,b)=>b.score-a.score||a.amount-b.amount).slice(0,limit);
}
export async function inspect(items,{githubGet=getGitHub,limit=4,now=Date.now(),token=''}={}){
 const picks=sampleTasks(items,limit);
 const findings=[];
 for(const x of picks){
  const m=issueLink.exec(x.url);
  if(!m)continue;
  const base='/repos/'+m[1]+'/'+m[2];
  try{
   const [issue,repo]=await Promise.all([githubGet(base+'/issues/'+m[3],token),githubGet(base,token)]);
   const [comments,pulls]=await Promise.all([
    issue.comments>0?githubGet(base+'/issues/'+m[3]+'/comments?per_page=100',token):Promise.resolve([]),
    githubGet(base+'/pulls?state=open&per_page=100',token)
   ]);
   if(!Array.isArray(comments)||!Array.isArray(pulls))throw Error('competition cannot be verified');
   const verdict=evaluate(issue,comments,repo,now,pulls);
   findings.push({
    issue:x.url,advertised_reward:x.amount+' '+x.currency,
    status:verdict.decision,
    reasons:verdict.reasons,
    competition:verdict.competition,
    next_evidence:verdict.next_evidence,
    issue_open:issue.state==='open',
    issue_comments:issue.comments||0,updated_at:issue.updated_at||null,
    note:'Competition alone does not disqualify. Not a payout offer or submission permission.'
   });
  }catch(e){
   findings.push({issue:x.url,status:'UNVERIFIED',reasons:['source inspection unavailable'],error:String(e.message).slice(0,60)});
  }
 }
 return {
  scanned_at:new Date(now).toISOString(),
  sources_checked:findings.length,
  conditional_candidates:findings.filter(x=>['TRY_CONSTRAINED_FIX','COMPETE_WITH_BETTER_EVIDENCE'].includes(x.status)).length,
  competitive_candidates:findings.filter(x=>x.status==='COMPETE_WITH_BETTER_EVIDENCE').length,
  needs_verification:findings.filter(x=>x.status==='VERIFY_FIRST').length,
  rejected:findings.filter(x=>x.status==='REJECT').length,
  unverified:findings.filter(x=>x.status==='UNVERIFIED').length,
  findings,earned_amount_verified:0,
  note:'Read-only public GitHub due diligence. Commercial task eligibility and financial payout are not verified.'
 };
}
export function render(a){
 const lines=['## Toyol Quest Intelligence (read-only)','',
 '- Original bounty issues inspected: **'+a.sources_checked+'**',
 '- Research or competitive draft candidates (unverified): **'+a.conditional_candidates+'**',
 '- Competitive candidates: **'+(a.competitive_candidates||0)+'** | Needs verification: **'+(a.needs_verification||0)+'**',
 '- Rejected: **'+a.rejected+'** | Could not verify: **'+a.unverified+'**',
 '- Work accepted: **0** | Income verified: **RM0**',''];
 for(const f of a.findings){
  lines.push('- '+f.issue+' — **'+f.status+'**'+(f.reasons?.length?' ('+f.reasons.join('; ')+')':'')+(f.competition?.competitive?' [competition signals present]':''));
 }
 lines.push('','A candidate is not permission to claim, submit, or receive payment.');
 return lines.join('\n')+'\n';
}
async function main(){
 const feed=JSON.parse(readFileSync('out/feed.json','utf8'));
 const report=await inspect(feed.items,{token:process.env.GITHUB_TOKEN||''});
 mkdirSync('out/intelligence',{recursive:true});
 writeFileSync('out/intelligence/quest-check.json',JSON.stringify(report,null,2));
 const markdown=render(report);
 writeFileSync('out/intelligence/quest-check.md',markdown);
 console.log(markdown);
 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,markdown);
}
if(process.argv[1]?.endsWith('quest-intel.mjs'))main().catch(e=>{console.error(e.message);process.exitCode=1;});
