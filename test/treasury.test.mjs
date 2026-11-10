import test from 'node:test';
import assert from 'node:assert/strict';
import {treasuryView,investmentDecision} from '../src/treasury.mjs';
test('advertised bounties never count as owned liquid money',()=>{
 const balance=treasuryView([{type:'ADVERTISED_REWARD',amount_myr:500,reference:'ad-1'}]);
 assert.equal(balance.available_myr,0);
 assert.equal(investmentDecision(balance,{cost_myr:0.01}).decision,'REJECT');
});
test('only reconciled paid and withdrawable receipts count',()=>{
 const a=treasuryView([{type:'SETTLED_RECEIPT',amount_myr:20,reference:'pay1',
  owner_recipient_verified:true,primary_payment_evidence_verified:true,withdrawable_myr_verified:true},
  {type:'SETTLED_RECEIPT',amount_myr:900,reference:'fake',owner_recipient_verified:false}]);
 assert.equal(a.available_myr,20);
 assert.equal(a.real_wallet_connected,false);
});
test('earned funds are not carte blanche for deposits or stakes',()=>{
 const balance={available_myr:100};
 assert.equal(investmentDecision(balance,{cost_myr:1,requires_stake:true}).decision,'REJECT');
 assert.equal(investmentDecision(balance,{cost_myr:1,upfront_to_unlock_income:true}).decision,'REJECT');
});
test('irreversible paid operations require specific approval and independent downside review',()=>{
 const balance={available_myr:100};
 const t={cost_myr:1,verified_provider_terms:true,payment_route_authorized:true,minimum_verified_payout_myr:3};
 assert.equal(investmentDecision(balance,t).decision,'APPROVAL_REQUIRED');
 assert.equal(investmentDecision(balance,t,{specific_payment_authorization:true,independent_downside_review:true}).decision,'ELIGIBLE_FOR_CONTROLLED_PAYMENT');
});
