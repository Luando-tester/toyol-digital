import test from 'node:test';
import assert from 'node:assert/strict';
import {FIRST_CATCH,firstCatchAssessment} from '../src/first-catch.mjs';

test('USD200 is an aspiration, NOT a minimum bounty value',()=>{
 assert.equal(FIRST_CATCH.competence_benchmark_usd,200);
 assert.equal(FIRST_CATCH.minimum_bounty_to_attempt,0);
 assert.equal(FIRST_CATCH.is_advertised_reward_gate,false);
 assert.equal(firstCatchAssessment({advertised_amount:3,currency:'USD'}).eligible_for_learning,true);
 assert.equal(firstCatchAssessment({advertised_amount:200,currency:'USD'}).eligible_for_learning,true);
});
test('advertised USD200 is stretch exposure, never evidence of competent work',()=>{
 const r=firstCatchAssessment({advertised_amount:200,currency:'USD'});
 assert.equal(r.status,'STRETCH_OPPORTUNITY');
 assert.equal(r.actual_benchmark_payment_confirmed,false);
 assert.equal(r.advertised_usd_equivalent,200);
});
test('currency questions stay unknown rather than excluding a training opportunity',()=>{
 const x=firstCatchAssessment({advertised_amount:500,currency:'USDC'});
 assert.equal(x.status,'CRYPTO_CASHABILITY_UNVERIFIED');
 assert.equal(x.eligible_for_learning,true);
});
test('MYR opportunities do not disappear simply because no conversion quote exists',()=>{
 const x=firstCatchAssessment({advertised_amount:1000,currency:'MYR'});
 assert.equal(x.status,'FX_EVIDENCE_REQUIRED');
 assert.equal(x.eligible_for_learning,true);
 assert.equal(firstCatchAssessment({advertised_amount:1000,currency:'MYR'},{usdToMyr:4.5}).status,'STRETCH_OPPORTUNITY');
});
