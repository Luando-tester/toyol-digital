/**
 * USD200 is an aspirational competence benchmark, NOT a bounty filter.
 * Toyol may learn from, compete for, and complete smaller work whenever
 * legitimate and worthwhile. A paid receipt is separate from capability.
 */
export const FIRST_CATCH=Object.freeze({
 competence_benchmark_usd:200,
 minimum_bounty_to_attempt:0,
 is_advertised_reward_gate:false,
 requires_verified_real_world_performance:true,
 jurisdiction:'Malaysia',
 currency_for_net_receipts:'MYR'
});
export function firstCatchAssessment(offer,{usdToMyr=null,otherToUsd=null,netUsdReceived=null,bankReceiptVerified=false}={}){
 const amount=Number(offer?.advertised_amount);
 const currency=String(offer?.currency||'').toUpperCase();
 if(!Number.isFinite(amount)||amount<=0)return {status:'INVALID_REWARD',eligible_for_learning:false};
 const received=bankReceiptVerified&&Number.isFinite(netUsdReceived)&&netUsdReceived>=0?netUsdReceived:null;
 let grossUsd=null;
 if(currency==='USD')grossUsd=amount;
 else if(currency==='MYR'&&Number.isFinite(usdToMyr)&&usdToMyr>0)grossUsd=amount/usdToMyr;
 else if(currency!=='USDC'&&Number.isFinite(otherToUsd)&&otherToUsd>0)grossUsd=amount*otherToUsd;
 const status=currency==='USDC'?'CRYPTO_CASHABILITY_UNVERIFIED':
  grossUsd===null?'FX_EVIDENCE_REQUIRED':
  grossUsd>=FIRST_CATCH.competence_benchmark_usd?'STRETCH_OPPORTUNITY':'FOUNDATION_OR_INTERMEDIATE_OPPORTUNITY';
 return {
  status,
  eligible_for_learning:true,
  suitable_as_paid_work_only_after_terms_and_payout_check:true,
  competence_benchmark_usd:FIRST_CATCH.competence_benchmark_usd,
  above_benchmark_advertised:grossUsd!==null&&grossUsd>=FIRST_CATCH.competence_benchmark_usd,
  advertised_usd_equivalent:grossUsd===null?null:Math.round(grossUsd*100)/100,
  actual_benchmark_payment_confirmed:received!==null&&received>=FIRST_CATCH.competence_benchmark_usd,
  verified_net_usd_receipt:received,
  note:'USD200 is a capability aspiration, not a minimum gig value, a payout guarantee, or a reason to skip smaller field practice.'
 };
}