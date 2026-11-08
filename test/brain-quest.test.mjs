import test from 'node:test';
import assert from 'node:assert/strict';
import {questUrls,rankFilePaths,main} from '../src/brain-quest.mjs';
import {readFileSync,existsSync,rmSync} from 'node:fs';

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
  getIssue:async()=>({body:'- Sumber asal: https://github.com/acme/repo/issues/15'}),
  runAttempt:async()=>{throw Error('human-only participation');}
 });
 assert.equal(x.sampled_quest_count,1);
 assert.equal(x.status,'NO_ELIGIBLE_REAL_QUEST');
 assert.equal(x.earned_amount_verified,0);
 assert.match(x.evaluated[0].reason,/human-only/);
});
test('a draft may be described as unsubmitted but never as earned',async()=>{
 const x=await main({
  getIssue:async()=>({body:'- Sumber asal: https://github.com/acme/repo/issues/15'}),
  runAttempt:async()=>({status:'AI_DRAFT_CREATED_NOT_SUBMITTED',issue:'https://github.com/acme/repo/issues/15',edited_files:['src/fix.js'],earned_amount_verified:0})
 });
 assert.equal(x.status,'AI_DRAFT_CREATED_NOT_SUBMITTED');
 assert.equal(x.earned_amount_verified,0);
 assert.equal(x.external_bounty_accepted,false);
});
