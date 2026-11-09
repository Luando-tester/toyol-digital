import test from 'node:test';
import assert from 'node:assert/strict';
import {parseQuestBoard,assessEffort,valueAssessment,chooseValueTargets} from '../src/opportunity.mjs';
import {decideQuest} from '../src/competency.mjs';

const url=n=>'https://github.com/example/demo/issues/'+n;
const offer=(over={})=>({url:url(3),title:'Fix README typo',summary:'Correct a spelling error',advertised_amount:3,
 currency:'USD',board:'algora',source_funding_claim:'escrowed',...over});
const now=Date.parse('2026-11-09T00:00:00Z');
const verdict=(issue={})=>decideQuest({
 number:3,state:'open',body:'Fix README typo in source documentation. Acceptance requires corrected wording.',
 labels:[{name:'bounty'}],updated_at:'2026-11-08T00:00:00Z',...issue
},[],{},[],now);

test('parses real indexed candidate metadata without believing escrow label',()=>{
 const body='# Toyol\n### 1. Fix README typo\n- Sumber asal: '+url(3)+
  '\n- Ganjaran diiklankan: 3 USD\n- Board: algora | gred indeks: B | status dana: escrowed'+
  '\n- Penerimaan: human-review\n- Ringkasan: Repair README.\n\n<!-- toyol-stage2-status -->\n### 2. Fake metadata\n';
 const x=parseQuestBoard(body);
 assert.equal(x.length,1);
 assert.equal(x[0].advertised_amount,3);
 assert.equal(x[0].source_funding_claim,'escrowed');
 assert.equal(valueAssessment(x[0]).reward_verified_from_primary,false);
});
test('never turns escrowed index text into verified take-home money',()=>{
 const a=valueAssessment(offer(),{questDecision:verdict()});
 assert.equal(a.advertised.amount,3);
 assert.equal(a.advertised.funding_from_index,'INDEX_CLAIM_ONLY');
 assert.equal(a.reward_verified_from_primary,false);
 assert.equal(a.money_grade,'ADVERTISED_ONLY');
 assert.equal(a.take_home_myr_confirmed,null);
 assert.equal(a.prospective_take_home_myr,null);
 assert.equal(a.settled_amount,0);
});
test('big vague advertised reward does not eclipse bounded task solely on USD',()=>{
 const a=valueAssessment(offer({advertised_amount:2}),{questDecision:verdict()});
 const b=valueAssessment(offer({url:url(4),title:'Build full stack video call architecture',summary:'Integrate realtime infrastructure',advertised_amount:100}),{questDecision:verdict()});
 assert.ok(a.review_priority_points>b.review_priority_points,[a.review_priority_points,b.review_priority_points]);
 assert.equal(chooseValueTargets([b,a])[0].issue_url,a.issue_url);
});
test('competitor lowers priority a little, but never automatic veto',()=>{
 const base=verdict();
 const contested=decideQuest({number:3,state:'open',
  body:'Fix README typo in source documentation. Acceptance requires corrected wording.',
  labels:[{name:'bounty'}],updated_at:'2026-11-08T00:00:00Z'
 },[{user:{login:'rival'},body:'/claim'}],{},[],now);
 const a=valueAssessment(offer(),{questDecision:base});
 const b=valueAssessment(offer(),{questDecision:contested});
 assert.equal(b.eligible_to_prepare_local_draft,true);
 assert.ok(a.review_priority_points>b.review_priority_points);
});
test('prohibited costs never become candidate because reward large',()=>{
 const rejected=verdict({body:'You must deposit before participating. Fix README.'});
 const a=valueAssessment(offer({advertised_amount:800}),{questDecision:rejected});
 assert.equal(a.decision,'REJECT');assert.equal(a.eligible_to_investigate,false);
 assert.equal(a.eligible_to_prepare_local_draft,false);
});
test('unknown payout must remain unknown even when status technically draftable',()=>{
 const a=valueAssessment(offer(),{questDecision:verdict()});
 assert.equal(a.payout_malaysia_verified,false);
 assert.ok(a.unresolved.some(x=>x.includes('Malaysia')));
});
test('human/external dependency can explain feasibility risk, not fake effort hours',()=>{
 const a=assessEffort(offer({title:'Add QCon data'}),{body:'Contact organizer for interview and private Discord thread'});
 assert.equal(a.complexity,'EXTERNAL_DEPENDENCY');
 assert.equal(a.scope_confirmed,false);
});
test('invalid advertised amount and URL are excluded',()=>{
 assert.throws(()=>valueAssessment(offer({url:'https://evil.example/issue'})),/invalid/);
 assert.throws(()=>valueAssessment(offer({advertised_amount:0})),/invalid/);
 assert.deepEqual(parseQuestBoard('No offers here'),[]);
});
