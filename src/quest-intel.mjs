/**
 * Toyol Quest Intelligence — read-only GitHub issue due diligence.
 * A bounty listing is not payment proof or permission to auto-submit.
 * Never sends comments, claims, PRs, network payments, or writes to third-party repos.
 */
import {readFileSync,mkdirSync,writeFileSync,appendFileSync} from 'node:fs';
import {parseGig,shortlist} from './toyol.mjs';
const issueLink=/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/issues\/([1-9]\d*)(?:[?#].*)?$/;
const boards=new Set(['algora','bountyhub','issuehunt','opire']);
const contest=/\/(?:claim|attempt)\b|(?:submitted|opened|created)\s+(?:a\s+)?PR\b|(?:pull request|\/pull\/)\s*#?\d+|(?:already|currently)\s+(?:working on|implemented|solved)/i;
const humanRestriction=/\b(?:meaningful human contribution|human[- ]only|manual[- ]only|bots? not allowed|AI[- ]generated submissions? (?:are )?(?:not allowed|prohibited)|no AI[- ]generated work)\b/i;
const incomplete=/\b(?:deposit|stake|staking|funding required|pay.*fee|subscribe)\b/i;

export function evaluate(issue,comments=[],repo={},now=Date.now()){
 const reasons=[];
 if(issue.state!=='open'||issue.locked)reasons.push('not open/unlocked');
 if(repo.archived||repo.disabled||repo.private)reasons.push('repository not usable');
 if(issue.assignee||issue.assignees?.length)reasons.push('assigned');
 if(issue.comments>30)reasons.push('over 30 comments: high competition');
 const body=String(issue.body||'');
 const content=body+'\n'+comments.slice(0,50).map(x=>x.body||'').join('\n');
 if(humanRestriction.test(content))reasons.push('human contribution required or AI disallowed');
 if(incomplete.test(content))reasons.push('payment/deposit condition');
 if(comments.some(x=>contest.test(String(x.body||''))))reasons.push('existing claim, PR or attempt');
 if(!issue.labels?.some(x=>/bounty|reward|paid/i.test(x.name))&&!/\/bounty\s+\$?\d+|\bbounty of\b/i.test(content))reasons.push('no independently visible bounty marker');
 if(body.trim().length<40)reasons.push('unclear acceptance requirements');
 const age=Date.parse(issue.updated_at||issue.created_at||'');
 if(Number.isFinite(age)&&now-age>1000*60*60*24*180)reasons.push('stale issue: not updated in 180 days');
 return {pass:reasons.length===0,reasons};
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
 return shortlist(items,1000).filter(x=>boards.has(x.source)&&issueLink.test(x.url)&&x.amount<=30)
   .sort((a,b)=>a.amount-b.amount).slice(0,limit);
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
   const comments=issue.comments>0?await githubGet(base+'/issues/'+m[3]+'/comments?per_page=50',token):[];
   if(!Array.isArray(comments))throw Error('comments not verified');
   const verdict=evaluate(issue,comments,repo,now);
   findings.push({
    issue:x.url,advertised_reward:x.amount+' '+x.currency,
    status:verdict.pass?'POSSIBLE_NEEDS_PLATFORM_TERMS_VERIFICATION':'REJECTED',
    reasons:verdict.reasons,issue_open:issue.state==='open',
    issue_comments:issue.comments||0,updated_at:issue.updated_at||null,
    note:'Not a payout offer, eligibility certification or permission to submit.'
   });
  }catch(e){
   findings.push({issue:x.url,status:'UNVERIFIED',reasons:['source inspection unavailable'],error:String(e.message).slice(0,60)});
  }
 }
 return {
  scanned_at:new Date(now).toISOString(),
  sources_checked:findings.length,
  conditional_candidates:findings.filter(x=>x.status.startsWith('POSSIBLE_')).length,
  rejected:findings.filter(x=>x.status==='REJECTED').length,
  unverified:findings.filter(x=>x.status==='UNVERIFIED').length,
  findings,earned_amount_verified:0,
  note:'Read-only public GitHub due diligence. Commercial task eligibility and financial payout are not verified.'
 };
}
export function render(a){
 const lines=['## Toyol Quest Intelligence (read-only)','',
 '- Original bounty issues inspected: **'+a.sources_checked+'**',
 '- Not immediately disqualified (still unverified): **'+a.conditional_candidates+'**',
 '- Rejected: **'+a.rejected+'** | Could not verify: **'+a.unverified+'**',
 '- Work accepted: **0** | Income verified: **RM0**',''];
 for(const f of a.findings){
  lines.push('- '+f.issue+' — **'+f.status+'**'+(f.reasons?.length?' ('+f.reasons.join('; ')+')':''));
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
