import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseInstruction, change, applyInstruction } from '../src/skills.mjs';

test('recognizes three narrowly scoped repair instructions', () => {
 assert.deepEqual(parseInstruction('Rename oldProp to newProp'),{kind:'rename-identifier',from:'oldProp',to:'newProp'});
 assert.deepEqual(parseInstruction('Remove disableAutoFocus in favor of focusOnHover={false}'),{kind:'jsx-boolean-prop',from:'disableAutoFocus',to:'focusOnHover',bool:'false'});
 assert.deepEqual(parseInstruction('Fix typo documnt to document in README'),{kind:'docs-typo',from:'documnt',to:'document'});
});
test('refuses vague instructions and multi-step requests', () => {
 assert.equal(parseInstruction('Build an API and fix bugs'),null);
 assert.equal(parseInstruction('Rename foo to foo'),null);
});
test('JSX prop skill only changes standalone boolean properties', () => {
 const spec=parseInstruction('Remove disableAutoFocus in favor of focusOnHover={false}');
 const source='<Canvas disableAutoFocus className="ok" />;\n<Canvas disableAutoFocus={true} />\nconst disableAutoFocus = 1';
 const result=change(source,spec);
 assert.equal(result.count,1);
 assert.match(result.content,/Canvas focusOnHover=\{false\} className/);
 assert.match(result.content,/disableAutoFocus=\{true\}/);
});
test('README typo skill leaves source code alone',()=>{
 const root=mkdtempSync(join(tmpdir(),'toyol-skills-'));
 try{
  mkdirSync(join(root,'src'));
  writeFileSync(join(root,'README.md'),'Read the documnt first.\n');
  writeFileSync(join(root,'src','index.ts'),'const documnt = true;\n');
  const result=applyInstruction(root,parseInstruction('Fix typo documnt to document in README'));
  assert.equal(result.count,1);
  assert.match(readFileSync(join(root,'README.md'),'utf8'),/document/);
  assert.match(readFileSync(join(root,'src','index.ts'),'utf8'),/documnt/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('identifier changes reject oversized/scope-spanning fixes',()=>{
 const root=mkdtempSync(join(tmpdir(),'toyol-skills-'));
 try{
  mkdirSync(join(root,'src'));
  writeFileSync(join(root,'src','index.ts'),Array(17).fill('oldProp').join(' '));
  assert.throws(()=>applyInstruction(root,parseInstruction('Rename oldProp to newProp')),/no small deterministic fix/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
