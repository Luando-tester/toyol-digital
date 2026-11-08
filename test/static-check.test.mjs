import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {staticValidate} from '../src/static-check.mjs';

test('valid JS, Python and JSON use syntax-only checks',()=>{
 const root=mkdtempSync(join(tmpdir(),'toyol-static-'));
 try{
  mkdirSync(join(root,'src'));mkdirSync(join(root,'data'));
  writeFileSync(join(root,'src','main.js'),'const answer = 42;\n');
  writeFileSync(join(root,'src','check.py'),'def answer():\n  return 42\n');
  writeFileSync(join(root,'data','x.json'),'{"answer":42}');
  const results=staticValidate(root,['src/main.js','src/check.py','data/x.json']);
  assert.equal(results.length,3);assert.ok(results.every(x=>x.result==='pass'));
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('invalid JS fails before evidence is prepared',()=>{
 const root=mkdtempSync(join(tmpdir(),'toyol-static-'));
 try{
  writeFileSync(join(root,'broken.js'),'function broken( {');
  assert.throws(()=>staticValidate(root,['broken.js']),/syntax/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('path traversal is refused',()=>{
 const root=mkdtempSync(join(tmpdir(),'toyol-static-'));
 try{assert.throws(()=>staticValidate(root,['../escape.js']),/unsafe/);}
 finally{rmSync(root,{recursive:true,force:true});}
});
test('TS and Markdown are explicitly limited, not falsely certified',()=>{
 const root=mkdtempSync(join(tmpdir(),'toyol-static-'));
 try{
  writeFileSync(join(root,'sample.ts'),'const sample: number=5;');
  writeFileSync(join(root,'README.md'),'# A document\n');
  const results=staticValidate(root,['sample.ts','README.md']);
  assert.ok(results.every(x=>x.result==='limited'));
 }finally{rmSync(root,{recursive:true,force:true});}
});
