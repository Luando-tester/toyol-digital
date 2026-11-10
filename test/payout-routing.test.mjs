import test from 'node:test';
import assert from 'node:assert/strict';
import {payoutRoute,tngReceiptStatus} from '../src/payout-routing.mjs';
const receipt={amount:10,currency:'MYR',deliverable_accepted_verified:true,
 settlement_proof_verified:true,payout_account_belongs_to_owner:true};
test('unaccepted offer is not money owned by Toyol',()=>{
 const r=payoutRoute({amount:250,currency:'USD',settlement_proof_verified:false});
 assert.equal(r.status,'NOT_OWNED_OR_NOT_SETTLED');
 assert.equal(r.owned_amount,0);
});
test('verified ringgit payout may be ready to send, but not sent or received',()=>{
 const r=payoutRoute({...receipt,provider_supports_tng_duitnow_verified:true,owner_tng_receiving_verified:true});
 assert.equal(r.status,'MYR_READY_FOR_TNG_TRANSFER');
 assert.equal(r.can_send_to_tng,false);
 assert.equal(r.received_by_tng_verified,false);
});
test('crypto sits externally, not inside TNG and cannot be silently converted',()=>{
 const r=payoutRoute({...receipt,currency:'USDC',custodian:'Taskmarket Base wallet'});
 assert.equal(r.status,'CRYPTO_HELD_OUTSIDE_TNG');
 assert.equal(r.owned_currency,'USDC');
 assert.equal(r.received_by_tng_verified,false);
});
test('foreign fiat remains in provider account until a verified local cashout is executed',()=>{
 const r=payoutRoute({...receipt,currency:'USD'});
 assert.equal(r.status,'FOREIGN_FIAT_HELD_EXTERNALLY');
 assert.equal(r.owned_currency,'USD');
});
test('TNG receipt needs direct evidence of transfer and actual credit',()=>{
 assert.equal(tngReceiptStatus({amount_myr:200,provider_transfer_settled_verified:true}).amount_myr,0);
 assert.equal(tngReceiptStatus({amount_myr:200,provider_transfer_settled_verified:true,
  owner_tng_credit_verified:true,independent_evidence_verified:true}).amount_myr,200);
});
