/**
 * Capability growth is earned by field evidence, never by number of tests,
 * amount advertised, size of model, or number of local draft attempts.
 *
 * Levels are recommendations for training scope, NOT certificates. External
 * test/acceptance references must be independently checked before promotion.
 */
export const LEVELS=Object.freeze([
 {id:'FOUNDATION',description:'Reproduce and repair one bounded external problem'},
 {id:'FIELD_VERIFIED',description:'External problem solved with relevant independent tests'},
 {id:'COMPETITIVE',description:'Work accepted or compared with tested alternative'},
 {id:'ADVANCED',description:'Multiple accepted jobs with higher scope and verified payout'}
]);
export function capabilityStatus(records=[]){
 const valid=Array.isArray(records)?records.filter(r=>
  typeof r?.issue_url==='string'&&/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/[1-9]\d*$/.test(r.issue_url)&&
  typeof r?.evidence_url==='string'&&/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/(?:actions\/runs\/\d+|pull\/\d+|issues\/\d+(?:#issuecomment-\d+)?)$/.test(r.evidence_url)
 ):[];
 const tested=valid.filter(r=>r.independent_tests_passed===true);
 const accepted=tested.filter(r=>r.maintainer_accepted===true);
 const paid=accepted.filter(r=>r.payment_receipt_verified===true);
 let tier='FOUNDATION';
 if(tested.length>=1)tier='FIELD_VERIFIED';
 if(accepted.length>=1)tier='COMPETITIVE';
 if(accepted.length>=3&&paid.length>=1)tier='ADVANCED';
 return {tier,observed_external_test_successes:tested.length,observed_accepted_jobs:accepted.length,
  observed_paid_jobs:paid.length,
  requires_evidence_review:true,
  note:'Provided links/claims still need independent inspection. Local drafts and advertised USD never promote competence.'};
}
export function learningRole(offer){
 const amount=Number(offer?.advertised_amount);
 const title=String(offer?.title||'')+' '+String(offer?.summary||'');
 if(/infrastructure|architecture|full stack|payment gateway|distributed|realtime|integration|migration/i.test(title))
  return 'STRETCH_COMPLEX';
 if(Number.isFinite(amount)&&amount>=200&&offer?.currency==='USD')return 'STRETCH_VALUE';
 return 'FIELD_PRACTICE';
}
export function balancedFieldSelection(ranked,limit=5,runNumber=1){
 const n=Math.max(1,Math.min(5,Math.floor(Number(limit))||1));
 const list=Array.isArray(ranked)?ranked:[];
 const selected=list.slice(0,n);
 const role=x=>learningRole(x?.offer);
 const practice=list.find(x=>role(x)==='FIELD_PRACTICE');
 const challenges=list.filter(x=>role(x)!=='FIELD_PRACTICE');
 if(n>1&&selected.length>1&&practice&&!selected.some(x=>role(x)==='FIELD_PRACTICE'))
  selected[selected.length-1]=practice;
 if(n>1&&selected.length>1&&challenges.length&&!selected.some(x=>role(x)!=='FIELD_PRACTICE')){
  const idx=(Math.max(1,Math.floor(Number(runNumber)||1))-1)%challenges.length;
  selected[selected.length-1]=challenges[idx];
 }
 return [...new Map(selected.map(x=>[x.issue_url,x])).values()]
  .map(x=>({...x,learning_role:learningRole(x.offer)}));
}
