import test from 'node:test';
import assert from 'node:assert/strict';
import {questUrls,chooseQuestBatch,rankFilePaths,main} from '../src/brain-quest.mjs';
import {readFileSync,existsSync,rmSync} from 'node:fs';
const premiumBoard='### 1. Fix parser issue\n- Sumber asal: https://github.com/acme/repo/issues/15\n- Ganjaran diiklankan: 250 USD\n- Board: algora | gred indeks: B | status dana: escrowed\n- Penerimaan: human-review\n- Ringkasan: Fix parser with tests';

test('only GitHub issues listed as original bounty sources are selected',()=>{
 const body=['- Sumber asal: https://github.com/acme/code/issues/12',
 '- Bukti pelaksanaan: https://github.com/acme/other/issues/8',
 '- Sumber asal: https://github.com/acme/code/issues/12',
 '- Sumber asal: https://example.com/task/2'].join('\n');
 assert.deepEqual(questUrls(body),['https://github.com/acme/code/issues/12']);
});
test('ranks source files related to task while excluding private or unsafe files',()=>{
 const p=rankFilePaths(['src/parser.js','src/other.js','README.md','.env','src/../../secrets.js','tests/parser.test.js'],'Fix parser issue');
 assert.equal(p[0],'src/parser.js');
 assert.ok(!p.includes('.env'));
 assert.ok(!p.includes('src/../../secrets.js'));
});
test('real quest bridge records honest failed eligibility without pretending income',async()=>{
 const x=await main({
  getIssue:async()=>({body:premiumBoard}),
  runAttempt:async()=>{throw Error('human-only participation');}
 });
 assert.equal(x.sampled_quest_count,1);
 assert.equal(x.status,'NO_ELIGIBLE_REAL_QUEST');
 assert.equal(x.earned_amount_verified,0);
 assert.match(x.evaluated[0].reason,/human-only/);
});
test('a draft may be described as unsubmitted but never as earned',async()=>{
 const x=await main({
  getIssue:async()=>({body:premiumBoard}),
  runAttempt:async()=>({status:'AI_DRAFT_CREATED_NOT_SUBMITTED',issue:'https://github.com/acme/repo/issues/15',edited_files:['src/fix.js'],earned_amount_verified:0})
 });
 assert.equal(x.status,'AI_DRAFT_CREATED_NOT_SUBMITTED');
 assert.equal(x.earned_amount_verified,0);
 assert.equal(x.external_bounty_accepted,false);
});

test('first paid win does not accept a sub-USD200 opportunity through legacy fallback',async()=>{
 let attempted=0;
 const x=await main({
  getIssue:async()=>({body:'### 1. Tiny gig\n- Sumber asal: https://github.com/acme/repo/issues/3\n- Ganjaran diiklankan: 3 USD\n- Board: algora | gred indeks: B | status dana: escrowed'}),
  runAttempt:async()=>{attempted++;return {status:'AI_DRAFT_CREATED_NOT_SUBMITTED'};}
 });
 assert.equal(x.status,'NO_USD200_PLUS_PAID_QUEST_IN_BOARD');
 assert.equal(attempted,0);
});

test('resilience quest rotation makes progress beyond the same first five tasks',()=>{
 const all=Array.from({length:12},(_,i)=>'https://github.com/acme/demo/issues/'+(i+1));
 const one=chooseQuestBatch(all,1);
 const two=chooseQuestBatch(all,2);
 const three=chooseQuestBatch(all,3);
 assert.equal(one.length,5);
 assert.equal(two.length,5);
 assert.equal(three.length,5);
 assert.deepEqual(one,all.slice(0,5));
 assert.deepEqual(two,all.slice(5,10));
 assert.deepEqual(three,[all[10],all[11],all[0],all[1],all[2]]);
 assert.equal(new Set(three).size,5);
});
test('quest batch rejects unsafe URLs and handles invalid run number without duplication',()=>{
 const urls=['https://github.com/acme/demo/issues/1','https://github.com/acme/demo/issues/1','https://example.com/unsafe'];
 assert.deepEqual(chooseQuestBatch(urls,'invalid'),['https://github.com/acme/demo/issues/1']);
});
