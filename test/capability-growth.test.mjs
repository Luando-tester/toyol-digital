import test from 'node:test';
import assert from 'node:assert/strict';
import {capabilityStatus,learningRole,balancedFieldSelection} from '../src/capability-growth.mjs';

const record={issue_url:'https://github.com/example/demo/issues/3',
 evidence_url:'https://github.com/example/demo/pull/7'};
test('100 draft attempts never count as demonstrated external competence',()=>{
 const x=capabilityStatus(Array.from({length:100},()=>({...record,
   local_draft:true,independent_tests_passed:false,maintainer_accepted:false})));
 assert.equal(x.tier,'FOUNDATION');
 assert.equal(x.observed_accepted_jobs,0);
});
test('progression requires observed independent external tests, acceptance and payment evidence',()=>{
 assert.equal(capabilityStatus([{...record,independent_tests_passed:true}]).tier,'FIELD_VERIFIED');
 assert.equal(capabilityStatus([{...record,independent_tests_passed:true,maintainer_accepted:true}]).tier,'COMPETITIVE');
 const accepted=[1,2,3].map(i=>({
  issue_url:'https://github.com/example/demo/issues/'+i,
  evidence_url:'https://github.com/example/demo/pull/'+(10+i),
  independent_tests_passed:true,maintainer_accepted:true,payment_receipt_verified:i===3
 }));
 assert.equal(capabilityStatus(accepted).tier,'ADVANCED');
});
test('field practices and challenging real tasks both enter the shortlist',()=>{
 const rows=[
  {issue_url:'a',offer:{title:'Fix JSON parser',advertised_amount:30,currency:'USD'}},
  {issue_url:'b',offer:{title:'Fix README typo',advertised_amount:3,currency:'USD'}},
  {issue_url:'c',offer:{title:'Build full stack architecture',advertised_amount:450,currency:'USD'}},
  {issue_url:'d',offer:{title:'Fix documentation',advertised_amount:8,currency:'MYR'}},
  {issue_url:'e',offer:{title:'Fix CSV formatting',advertised_amount:10,currency:'USD'}},
  {issue_url:'f',offer:{title:'Fix integration tests',advertised_amount:200,currency:'USD'}}
 ];
 const x=balancedFieldSelection(rows,5,1);
 assert.equal(x.length,5);
 assert.ok(x.some(i=>i.learning_role==='FIELD_PRACTICE'));
 assert.ok(x.some(i=>i.learning_role.startsWith('STRETCH_')));
 assert.ok(x.some(i=>i.offer.advertised_amount<200));
 assert.equal(learningRole(rows[2].offer),'STRETCH_COMPLEX');
});
test('when only small opportunities exist, do not declare the board empty',()=>{
 const rows=[{issue_url:'a',offer:{title:'Fix README typo',advertised_amount:2,currency:'USD'}}];
 assert.equal(balancedFieldSelection(rows,5).length,1);
});
