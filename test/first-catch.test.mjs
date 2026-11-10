import test from 'node:test';
import assert from 'node:assert/strict';
import {FIRST_CATCH,firstCatchAssessment} from '../src/first-catch.mjs';

test('one paid first catch must target USD200, not aggregate tiny offers',()=>{
 assert.equal(FIRST_CATCH.minimum_usd_net,200);
 assert.equal(FIRST_CATCH.per_single_paid_engagement,true);
 assert.equal(firstCatchAssessment({advertised_amount:199,currency:'USD'}).eligible_for_paid_first_catch,false);
 assert.equal(firstCatchAssessment({advertised_amount:200,currency:'USD'}).eligible_for_paid_first_catch,true);
});
test('a USD200 advertisement is only potential, not net earnings',()=>{
 const x=firstCatchAssessment({advertised_amount:200,currency:'USD'});
 assert.equal(x.status,'GROSS_TARGET_POSSIBLE_NET_AND_PAYOUT_UNVERIFIED');
 assert.equal(x.actual_first_catch_confirmed,false);
});
test('USDC crypto is not automatically cashable USD200 in Malaysian ringgit',()=>{
 assert.equal(firstCatchAssessment({advertised_amount:500,currency:'USDC'}).eligible_for_paid_first_catch,false);
});
test('ringgit offers need a verified exchange quote to compare to USD target',()=>{
 const x=firstCatchAssessment({advertised_amount:1000,currency:'MYR'});
 assert.equal(x.status,'FX_EVIDENCE_REQUIRED');
 assert.equal(firstCatchAssessment({advertised_amount:1000,currency:'MYR'},{usdToMyr:4.5}).eligible_for_paid_first_catch,true);
});
