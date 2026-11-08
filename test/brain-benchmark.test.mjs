import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarios,score,feedbackMessage,runIsolatedTests,solveScenario} from '../src/brain-benchmark.mjs';
import {statSync,existsSync} from 'node:fs';
import {join} from 'node:path';

const edit={edits:[{
 path:'src/uniqueIds.mjs',
 search:'    if (seen.has(record.id)) return true;\n    seen.add(record.id);\n    return false;',
 replace:'    if (seen.has(record.id)) return false;\n    seen.add(record.id);\n    return true;'
}]};

test('quality report counts tests, not paid bounty wins',()=>{
 const a=score([{status:'BEHAVIORAL_TESTS_PASS_IN_OFFLINE_SANDBOX',attempts:[{}]},
 {status:'BEHAVIORAL_TESTS_PASS_IN_OFFLINE_SANDBOX',attempts:[{},{}]},
 {status:'BEHAVIORAL_TESTS_NOT_PASSED',attempts:[{},{}]}]);
 assert.equal(a.passed,2);assert.equal(a.firstTry,1);assert.equal(a.success_rate,67);
});
test('test runner must be Docker with no network or writable code',()=>{
 let validated=false;
 const r=runIsolatedTests('/tmp/toyol-bench-safe',{run:(cmd,args)=>{
  assert.equal(cmd,'docker');
  for(const must of ['--network','none','--read-only','--cap-drop','ALL','--user','65534:65534'])
   assert.ok(args.includes(must));
  assert.ok(args.includes('node:22-alpine'));
  assert.ok(args.includes('tests/acceptance.test.mjs'));
  validated=true;return 'pass';
 }});
 assert.equal(r.pass,true);assert.equal(validated,true);
});
test('quality feedback clips untrusted messages',()=>{
 const msg=feedbackMessage('a'.repeat(1800));
 assert.equal(msg.length,1200);
});
test('bench engine creates a real patch, can use second-attempt feedback',async()=>{
 let modelCount=0,runCount=0;
 const result=await solveScenario(scenarios[0],{
  model:async messages=>{
   modelCount++;
   if(modelCount===2)assert.match(messages.at(-1).content,/Previous attempt failed/);
   return edit;
  },
  testRunner:async(root)=>{
   assert.equal(statSync(root).mode & 0o005,0o005,'fixture root must be readable/traversable by unprivileged Docker UID');
   assert.ok(existsSync(join(root,'tests','acceptance.test.mjs')),'acceptance tests must exist in sandbox');
   return {pass:++runCount===2,feedback:'Expected 2, actual 1'};
  }
 });
 assert.equal(result.status,'BEHAVIORAL_TESTS_PASS_IN_OFFLINE_SANDBOX',JSON.stringify(result));
 assert.equal(result.attempts.length,2);
 assert.equal(modelCount,2);
 assert.equal(result.earned_amount_verified,0);
 assert.ok(result.patch_sha256);
});
test('AI attempt that rewrites hidden tests never passes',async()=>{
 const result=await solveScenario(scenarios[0],{
  model:async()=>({edits:[{
   path:'tests/acceptance.test.mjs',search:'test(',replace:'test.skip('
  }]}),
  testRunner:async()=>{throw Error('test runner should never be reached');}
 });
 assert.equal(result.status,'BEHAVIORAL_TESTS_NOT_PASSED',JSON.stringify(result));
 assert.equal(result.earned_amount_verified,0);
});

test('missing acceptance file must be reported as infrastructure, not failed AI reasoning',()=>{
 const r=runIsolatedTests('/tmp/toyol-bench-safe',{run:()=>{
  const e=new Error('Docker exit 1');
  e.stdout="Could not find 'tests/acceptance.test.mjs'";
  throw e;
 }});
 assert.equal(r.infra,true);
 assert.equal(r.pass,false);
});
