/**
 * Toyol Competency Engine v1
 *
 * Competition is information, not an automatic disqualification.
 * Hard stops are for safety/eligibility. An advertised bounty is NOT a
 * verified payment, and a quality score is NOT a probability of winning.
 */
const humanOnly=/\b(?:meaningful human contribution|human[- ]only|manual[- ]only|bots? not allowed|AI[- ]generated submissions? (?:are )?(?:not allowed|prohibited)|no AI[- ]generated work)\b/i;
const payToWork=/\b(?:deposit (?:to|before)|(?:must|need to) (?:deposit|stake|pay)|staking required|pay an? (?:upfront |registration )?fee|buy (?:a )?subscription)\b/i;
const suspicious=/\b(?:reveal|paste|include|upload|print|leak|expose)\b.{0,140}\b(?:system prompt|internal instructions|hidden instructions|private key|seed phrase|API token|environment secrets)\b/i;
const claim=/^\s*\/(?:claim|attempt)\b|\b(?:i am|i'm|we are|i have|i've)\s+(?:claiming|working on|submitted|opened)\b|\b(?:claimed by|PR submitted)\b/i;
const noClaim=/\b(?:not claiming|not claimed|won't claim|cannot claim|not working on|will not submit)\b/i;
const refFor=n=>Number.isInteger(n)&&n>0?new RegExp('(?:\\b(?:fix(?:es|ed)?|close(?:s|d)?|resolve(?:s|d)?)\\s+#'+n+'\\b|#'+n+'\\b|/issues/'+n+'(?:\\b|$))','i'):null;
const hasBounty=issue=>!!issue.labels?.some(l=>/\b(bounty|reward|paid)\b/i.test(String(l.name||l)))||
 /\/bounty\s+\$?\d+|\bbounty of\b/i.test(String(issue.body||''));

export function competitionProfile(issue,comments=[],pulls=[]){
 const ref=refFor(issue.number);
 const related=(Array.isArray(pulls)?pulls:[]).filter(p=>ref?.test(String(p.title||'')+'\n'+String(p.body||'')));
 const openPRs=related.filter(p=>p.state==='open'&&!p.merged_at);
 const mergedPRs=related.filter(p=>!!p.merged_at);
 const claimers=[...new Set((Array.isArray(comments)?comments:[]).filter(c=>claim.test(String(c.body||''))&&!noClaim.test(String(c.body||'')))
  .map(c=>c.user?.login||'unknown').slice(0,80))];
 const commentsCount=Number.isFinite(Number(issue.comments))?Number(issue.comments):0;
 const signals=[
  ...(openPRs.length?['open competing pull request']:[]),
  ...(claimers.length?['explicit competitor claim']:[]),
  ...(commentsCount>20?['heavy discussion, not proof of completed work']:[])
 ];
 return {
  discussion_count:commentsCount,
  explicit_claims:claimers.length,
  linked_open_prs:openPRs.length,
  linked_merged_prs:mergedPRs.length,
  competitive:signals.length>0,
  signals,
  related_open_pr_urls:openPRs.map(p=>p.html_url).filter(Boolean).slice(0,5),
  // Discussion volume and self-reported claims cannot establish patch quality.
  quality_of_competitor_solution:'NOT_VERIFIED'
 };
}
export function decideQuest(issue,comments=[],repo={},pulls=[],now=Date.now()){
 const profile=competitionProfile(issue,comments,pulls);
 const blockers=[],review=[];
 const body=String(issue.body||'');
 const source=body+'\n'+(Array.isArray(comments)?comments:[]).slice(0,50).map(c=>String(c.body||'')).join('\n');
 if(issue.state!=='open'||issue.locked)blockers.push('issue closed or locked');
 if(repo.private||repo.archived||repo.disabled)blockers.push('repository not usable');
 if(humanOnly.test(source))blockers.push('human contribution required or AI disallowed');
 if(payToWork.test(source))blockers.push('upfront payment or deposit required');
 if(suspicious.test(body))blockers.push('instructions/credentials disclosure requested');
 if(!hasBounty(issue))review.push('reward not independently visible in original issue');
 if(body.trim().length<40)review.push('acceptance criteria too vague');
 if(issue.assignee||issue.assignees?.length)review.push('issue assigned; participation may be restricted');
 const updated=Date.parse(issue.updated_at||issue.created_at||'');
 if(Number.isFinite(updated)&&now-updated>180*24*60*60*1000)review.push('issue stale');
 if(profile.linked_merged_prs)review.push('related pull request already merged; possible completion');
 if((issue.comments||0)>50 && comments.length<Math.min(issue.comments,100))review.push('comment evidence incomplete');
 const decision=blockers.length?'REJECT':
   review.length?'VERIFY_FIRST':
   profile.competitive?'COMPETE_WITH_BETTER_EVIDENCE':'TRY_CONSTRAINED_FIX';
 return {
  decision,
  can_prepare_draft:['COMPETE_WITH_BETTER_EVIDENCE','TRY_CONSTRAINED_FIX'].includes(decision),
  hard_blocks:blockers,
  review_flags:review,
  competition:profile,
  next_evidence:[
   'identify relevant source and reproduce the reported failure',
   'produce an original minimal patch without editing acceptance tests',
   'compare issue requirements and any rival PR with observed behavior',
   'run independent behavioral regression tests in a safe environment',
   'verify platform automation rules, maintainer acceptance and payout before any claim'
  ],
  note:'Competition does not block analysis. No payment or PR submission is authorized.'
 };
}
export function qualityEvidence({reproduced=false,patch=false,syntax=false,tests=false,requirements=false,rivalCompared=false}={}){
 const criteria={failure_reproduced:!!reproduced,concrete_patch:!!patch,syntax_validated:!!syntax,
  independent_behavioral_tests:!!tests,acceptance_requirements_checked:!!requirements,
  competitor_solution_compared:!!rivalCompared};
 const present=Object.values(criteria).filter(Boolean).length;
 return {score:present,total:6,criteria,
  verdict:!patch?'NO_SOLUTION':!tests?'DRAFT_ONLY_NOT_FUNCTIONALLY_VERIFIED':
    !requirements?'TESTED_BUT_NOT_ACCEPTANCE_VERIFIED':'EVIDENCE_BACKED_CANDIDATE',
  caveat:'Evidence score is an audit checklist, not skill mastery, acceptance, win chance or money earned.'};
}
