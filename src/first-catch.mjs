/**
 * Founder mandate: first PAID win must be one settlement worth at least USD 200
 * net, cashable in Malaysia. Never add unrelated small gigs to reach the target.
 * Advertising >= USD200 is a search gate ONLY, not evidence of net earnings.
 */
export const FIRST_CATCH=Object.freeze({
 minimum_usd_net:200,
 per_single_paid_engagement:true,
 settlement_must_be_cashable_in_malaysia:true,
 no_deposits_or_upfront_fees:true
});
export function firstCatchAssessment(offer,{usdToMyr=null,otherToUsd=null,netUsdReceived=null,bankReceiptVerified=false}={}){
 const amount=Number(offer?.advertised_amount);
 const currency=String(offer?.currency||'').toUpperCase();
 if(!Number.isFinite(amount)||amount<=0)return {status:'INVALID_REWARD',eligible_for_paid_first_catch:false};
 const received=bankReceiptVerified&&Number.isFinite(netUsdReceived)&&netUsdReceived>=0?netUsdReceived:null;
 const actuallyAchieved=received!==null&&received>=FIRST_CATCH.minimum_usd_net;
 let grossUsd=null;
 if(currency==='USD')grossUsd=amount;
 else if(currency==='MYR'&&Number.isFinite(usdToMyr)&&usdToMyr>0)grossUsd=amount/usdToMyr;
 else if(currency!=='USDC'&&Number.isFinite(otherToUsd)&&otherToUsd>0)grossUsd=amount*otherToUsd;
 const qualifiedGross=grossUsd!==null&&grossUsd>=FIRST_CATCH.minimum_usd_net;
 const status=actuallyAchieved?'FIRST_CATCH_SETTLED_AND_RECORDED':
  currency==='USDC'?'CRYPTO_NOT_VERIFIED_AS_CASHABLE_MYR':
  grossUsd===null?'FX_EVIDENCE_REQUIRED':
  qualifiedGross?'GROSS_TARGET_POSSIBLE_NET_AND_PAYOUT_UNVERIFIED':'BELOW_FIRST_CATCH_TARGET';
 return {
  status,eligible_for_paid_first_catch:qualifiedGross&&currency!=='USDC',
  founder_target_usd_net:FIRST_CATCH.minimum_usd_net,
  estimated_advertised_usd:grossUsd===null?null:Math.round(grossUsd*100)/100,
  actual_first_catch_confirmed:actuallyAchieved,
  actual_net_usd_verified:received,
  payout_and_fees_verified:false,
  note:'A listed bounty never proves a USD200 net settlement. Do not pool many low-value gigs into the first catch.'
 };
}
