/**
 * Opportunity Intelligence. Never equate advertised rewards with accepted
 * work, settled funds, or cashable Malaysian earnings.
 */
const ISSUE=/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/[1-9]\d*$/;
const small=/\b(typo|readme|documentation|document|rename|replace|remove|boolean prop|markdown|test case|unit test|csv|json|parser|small fix|bug fix|fix typo)\b/i;
const large=/\b(infrastructure|full stack|entire|deploy|video call|realtime|distributed|oauth|payment gateway|multi[- ]tenant|architecture|full implementation|client email domains|multiple users|rewrite|migration|integrate external)\b/i;
const human=/\b(interview|contact organizer|organizer refuses|requires interview|manual research|attend|phone call|survey)\b/i;
const external=/\b(google palm2|deprecated api|closed api|requires credentials|requires api key|access to private|discord thread|private discord)\b/i;
const vague=/^(?:new feature|fix bug|improvement|task|enhancement)$/i;
const trustedBoard=new Set(['algora','opire','bountyhub','issuehunt']);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export function parseQuestBoard(body){
 const content=String(body||'').split('<!-- toyol-stage2-status -->')[0];
 const sections=content.split(/^###\s+\d+\.\s+/m).slice(1);
 const found=[];
 for(const section of sections){
  const title=(section.split('\n')[0]||'').trim().replace(/\\([*_[\]])/g,'$1');
  const url=(section.match(/^- Sumber asal: (https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/[1-9]\d*)\s*$/m)||[])[1];
  const reward=section.match(/^- Ganjaran diiklankan: ([0-9]+(?:\.[0-9]{1,4})?) (USD|USDC)\s*$/m);
  if(!ISSUE.test(url||'')||!reward)continue;
  const amount=Number(reward[1]);
  if(!(amount>0)||amount>100000)continue;
  const meta=section.match(/^- Board: ([a-z0-9_-]+) \| gred indeks: ([A-Z]) \| status dana: ([a-z0-9_-]+)/mi);
  const accept=section.match(/^- Penerimaan: ([^\n]+)/m);
  const summary=section.match(/^- Ringkasan: ([^\n]+)/m);
  found.push({url,title:title.slice(0,160),advertised_amount:amount,currency:reward[2],
   board:meta?.[1]?.toLowerCase()||'unknown',index_grade:meta?.[2]||null,
   source_funding_claim:meta?.[3]||'unknown',
   acceptance_type:accept?.[1]?.trim().slice(0,80)||'unknown',
   summary:summary?.[1]?.trim().slice(0,250)||''});
 }
 return [...new Map(found.map(x=>[x.url,x])).values()].slice(0,25);
}
export function assessEffort(offer,issue={}){
 const title=String(issue.title||offer.title||'');
 const body=String(issue.body||offer.summary||'').slice(0,2000);
 const content=title+'\n'+body;
 const signals=[];
 if(small.test(content))signals.push('bounded-code-or-documentation-keyword');
 if(large.test(content))signals.push('complex-architecture-or-integration-keyword');
 if(human.test(content))signals.push('human-outreach-potentially-required');
 if(external.test(content))signals.push('unavailable-service-or-secret-potentially-required');
 if(vague.test(title.trim()))signals.push('vague-title');
 const complexity=human.test(content)||external.test(content)?'EXTERNAL_DEPENDENCY':
  large.test(content)?'COMPLEX':small.test(content)?'BOUNDED_CANDIDATE':'UNKNOWN';
 return {complexity,signals,scope_confirmed:false,
  note:'Keyword heuristics only, not verified task effort or guaranteed competence.'};
}
export function valueAssessment(offer,{questDecision=null,effort=null,payoutEvidence=null,actualPayment=null}={}){
 const amount=Number(offer?.advertised_amount);
 const currency=String(offer?.currency||'');
 if(!ISSUE.test(offer?.url||'')||!['USD','USDC'].includes(currency)||!Number.isFinite(amount)||amount<=0)
  throw Error('invalid advertised offer');
 const status=questDecision?.decision||'VERIFY_FIRST';
 const effortView=effort||assessEffort(offer);
 const indexClaimsEscrow=trustedBoard.has(offer.board)&&offer.source_funding_claim==='escrowed';
 const verifiedEscrow=!!payoutEvidence?.escrow_verification_url&&payoutEvidence?.independent_primary_source===true;
 const malaysiaConfirmed=payoutEvidence?.malaysia_supported===true&&payoutEvidence?.cashout_confirmed===true;
 const paid=actualPayment?.accepted===true&&actualPayment?.settled===true&&Number.isFinite(actualPayment.amount)?
  Math.max(0,Number(actualPayment.amount)):0;
 const blocks=Array.isArray(questDecision?.hard_blocks)?questDecision.hard_blocks:[];
 const reviews=Array.isArray(questDecision?.review_flags)?questDecision.review_flags:[];
 const competition=questDecision?.competition||{};
 const rival=competition.linked_open_prs>0?'ACTIVE_PR':competition.explicit_claims>0?'CLAIMED':'UNKNOWN_OR_LOW';
 let priority=35;
 priority+=effortView.complexity==='BOUNDED_CANDIDATE'?28:
  effortView.complexity==='UNKNOWN'?0:-25;
 priority+=clamp(Math.log10(1+amount)*7,0,14);
 priority+=status==='TRY_CONSTRAINED_FIX'?12:status==='COMPETE_WITH_BETTER_EVIDENCE'?9:
  status==='VERIFY_FIRST'?-16:-80;
 priority+=verifiedEscrow?10:0;
 priority+=malaysiaConfirmed?9:0;
 priority-=rival==='ACTIVE_PR'?6:rival==='CLAIMED'?2:0;
 const eligibleToInvestigate=blocks.length===0;
 const eligibleToDraft=eligibleToInvestigate&&['TRY_CONSTRAINED_FIX','COMPETE_WITH_BETTER_EVIDENCE'].includes(status);
 return {
  issue_url:offer.url,
  advertised:{amount,currency,source:offer.board,
   funding_from_index:indexClaimsEscrow?'INDEX_CLAIM_ONLY':'NOT_SHOWN'},
  reward_verified_from_primary:verifiedEscrow,
  payout_malaysia_verified:malaysiaConfirmed,
  accepted_work_verified:actualPayment?.accepted===true,
  settled_amount:paid,
  take_home_myr_confirmed:null,
  prospective_take_home_myr:null,
  money_grade:paid>0?'SETTLED_CLAIM_NEEDS_PROOF':
   verifiedEscrow&&malaysiaConfirmed?'CASHOUT_ROUTE_VERIFIED_NO_EARNINGS':
   verifiedEscrow?'ESCROW_ONLY_NO_MY_CASHOUT_PROOF':'ADVERTISED_ONLY',
  effort:effortView,competitive_position:rival,decision:status,
  eligible_to_investigate:eligibleToInvestigate,
  eligible_to_prepare_local_draft:eligibleToDraft,
  review_priority_points:clamp(Math.round(priority),0,100),
  priority_definition:'Screening rubric only, NOT a win probability, expected income, hours estimate, or verified cash.',
  unresolved:[...reviews,
   ...(!verifiedEscrow?['funding not independently verified from primary source']:[]),
   ...(!malaysiaConfirmed?['Malaysia payout and cash-out not confirmed']:[]),
   ...(!paid?['maintainer acceptance and settlement not confirmed']:[])],
  actionable_value:effortView.complexity==='BOUNDED_CANDIDATE'?'potential for bounded patch/portfolio evidence':'unverified feasibility',
  note:'Advertised money is not earned; no spending, PR submission or claim is authorized.'
 };
}
export function chooseValueTargets(rows,max=5){
 return [...rows].filter(x=>x.eligible_to_investigate!==false)
  .sort((a,b)=>b.review_priority_points-a.review_priority_points||a.issue_url.localeCompare(b.issue_url))
  .slice(0,clamp(Math.floor(max)||1,1,5));
}
