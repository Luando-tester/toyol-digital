import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {plan,transform,solveFolder,collectPatch} from '../src/worker.mjs';
import {applyInstruction,parseInstruction} from '../src/skills.mjs';
import {execFileSync} from 'node:child_process';
const gig=(overrides={})=>({source:'algora',currency:'USD',amount:3,title:'Rename oldProp to newProp',summary:'Mechanical source rename',url:'https://github.com/abc/widget/issues/16',...overrides});
test('recognizes explicit code rename only',()=>{
 assert.equal(plan(gig())?.skill.from,'oldProp');
 assert.equal(plan(gig({title:'Build an app'})),null);
 assert.equal(plan(gig({summary:'deposit required'})),null);
 assert.equal(plan(gig({url:'https://example.net/task/1'})),null);
});
test('changes exact identifiers without partial names',()=>{
 const r=transform('oldProp oldPropNew foo.oldProp', 'oldProp','newProp');
 assert.equal(r.n,2);assert.equal(r.content,'newProp oldPropNew foo.newProp');
});
test('produces concrete modification from local source tree',()=>{
 const root=mkdtempSync(join(tmpdir(),'toyol-unit-'));
 try{
  mkdirSync(join(root,'src'));mkdirSync(join(root,'dist'));
  writeFileSync(join(root,'src','sample.ts'),'const oldProp = true;\nexport { oldProp };\n');
  writeFileSync(join(root,'dist','sample.ts'),'const oldProp = false;\n');
  const r=solveFolder(root,'oldProp','newProp');
  assert.equal(r.count,2);
  assert.deepEqual(r.files,['src/sample.ts']);
  assert.match(readFileSync(join(root,'src','sample.ts'),'utf8'),/newProp/);
  assert.match(readFileSync(join(root,'dist','sample.ts'),'utf8'),/oldProp/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('refuses a fix without matching source',()=>{
 const root=mkdtempSync(join(tmpdir(),'toyol-unit-'));
 try{mkdirSync(join(root,'src'));writeFileSync(join(root,'src','hello.ts'),'const hello = true;');
 assert.throws(()=>solveFolder(root,'oldProp','newProp'),/no safe small fix/);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('actual git patch captures root README fix (previously silently excluded)',()=>{
 const root=mkdtempSync(join(tmpdir(),'toyol-integration-'));
 const git=(args)=>execFileSync('git',args,{cwd:root,stdio:'pipe',timeout:10000});
 try {
  git(['init','--quiet']);
  writeFileSync(join(root,'README.md'),'A documnt has a typo.\n');
  git(['add','README.md']);
  git(['-c','user.name=ToyolTest','-c','user.email=toyol@example.invalid','commit','--quiet','-m','fixture']);
  const applied=applyInstruction(root,parseInstruction('Fix typo documnt to document in README'));
  assert.equal(applied.count,1);
  const patch=collectPatch(root);
  assert.match(patch,/diff --git a\/README\.md b\/README\.md/);
  assert.match(patch,/\+A document has a typo/);
  assert.match(patch,/-A documnt has a typo/);
 } finally {rmSync(root,{recursive:true,force:true});}
});
