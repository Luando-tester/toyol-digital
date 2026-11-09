import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {classifySetback,recoverPatch,resilienceSummary} from '../src/resilience.mjs';
import {collectContext} from '../src/brain-core.mjs';

function fixture(fn){
 const root=mkdtempSync(join(tmpdir(),'toyol-resilient-'));
 mkdirSync(join(root,'src'));
 mkdirSync(join(root,'tests'));
 writeFileSync(join(root,'src','add.mjs'),'export function add(a,b) { return a - b; }\n');
 writeFileSync(join(root,'tests','acceptance.test.mjs'),'// readonly test\n');
 return Promise.resolve().then(()=>fn(root)).finally(()=>rmSync(root,{recursive:true,force:true}));
}
const good={edits:[{path:'src/add.mjs',search:'return a - b;',replace:'return a + b;'}]};
test('rival competition is not an automatic hard stop',()=>{
 const p=classifySetback('existing competing pull request');
 assert.equal(p.type,'COMPETITION_TO_ANALYZE');assert.equal(p.retry,false);
});
test('upfront payment and human restriction stay hard stops',()=>{
 assert.equal(classifySetback('quest REJECT: upfront payment or deposit required').type,'HARD_STOP');
 assert.equal(classifySetback('human-only participation').type,'HARD_STOP');
});
test('rate limit is deferred to next run rather than hammered',()=>{
 assert.deepEqual(classifySetback('HTTP 429').type,'TRANSIENT_INFRA');
});
test('model failures may retry a new exact patch, at most once',async()=>fixture(async root=>{
 const context=collectContext(root,['src/add.mjs','tests/acceptance.test.mjs']);
 let calls=0;
 const result=await recoverPatch({
  root,context,task:'Fix addition in src/add.mjs',
  model:async messages=>{
   calls++;
   if(calls===2)assert.match(messages.at(-1).content,/previous attempt was not accepted/i);
   return calls===1?{edits:[{path:'src/add.mjs',search:'does not occur',replace:'return a + b;'}]}:good;
  }
 });
 assert.equal(calls,2);assert.equal(result.recovery_used,true);
 assert.deepEqual(result.attempts.map(a=>a.status),['FAILED','PATCH_VALIDATED']);
 assert.match(readFileSync(join(root,'src','add.mjs'),'utf8'),/return a \+ b/);
 assert.equal(readFileSync(join(root,'tests','acceptance.test.mjs'),'utf8'),'// readonly test\n');
 assert.equal(resilienceSummary(result.attempts).completed,true);
}));
test('unsafe model patch never repeats or edits a protected file',async()=>fixture(async root=>{
 const context=collectContext(root,['src/add.mjs','tests/acceptance.test.mjs']);
 let calls=0;
 await assert.rejects(()=>recoverPatch({
  root,context,task:'Fix addition in src/add.mjs',
  model:async()=>{calls++;return {edits:[{path:'tests/acceptance.test.mjs',search:'readonly',replace:'pass'}]};}
 }),e=>e.category==='HARD_STOP'&&e.attempts.length===1);
 assert.equal(calls,1);
 assert.match(readFileSync(join(root,'tests','acceptance.test.mjs'),'utf8'),/readonly/);
}));
test('repeated invalid proposals stop after bounded two attempts with failure evidence',async()=>fixture(async root=>{
 const context=collectContext(root,['src/add.mjs']);
 let calls=0;
 await assert.rejects(()=>recoverPatch({
  root,context,task:'Fix addition in src/add.mjs',
  model:async()=>{calls++;return {edits:[{path:'src/add.mjs',search:'not real source',replace:'return a + b;'}]};},
  maxAttempts:50
 }),e=>e.attempts.length===2&&e.category==='REPAIRABLE_MODEL_OUTPUT');
 assert.equal(calls,2);assert.match(readFileSync(join(root,'src','add.mjs'),'utf8'),/return a - b/);
}));
test('validator failure produces a second attempt but resets original source',async()=>fixture(async root=>{
 const context=collectContext(root,['src/add.mjs']);
 let calls=0;
 const result=await recoverPatch({
  root,context,task:'Fix addition in src/add.mjs',
  model:async()=>{calls++;return good;},
  validate:async()=>{
   if(calls===1)throw Error('patch missing or oversized');
   return {diff:'synthetic small diff'};
  }
 });
 assert.equal(result.diff,'synthetic small diff');
 assert.equal(result.attempts.length,2);
 assert.match(readFileSync(join(root,'src','add.mjs'),'utf8'),/return a \+ b/);
}));
