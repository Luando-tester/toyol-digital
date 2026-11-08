import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseExtra,editContent,applyExtra,extraSkillNames} from '../src/skills-plus.mjs';

test('the second skill pack contains eight distinct capabilities',()=>{
 assert.equal(extraSkillNames.length,8);
 assert.equal(new Set(extraSkillNames).size,8);
});
test('classify markdown link and heading repairs',()=>{
 assert.equal(parseExtra('Fix broken markdown link https://old.example/path to https://new.example/path in README.md')?.kind,'markdown-link');
 assert.equal(parseExtra('Rename markdown heading "Intro" to "Getting started" in docs/guide.md')?.kind,'markdown-heading');
});
test('classify imports, debug logs and ignore rules',()=>{
 assert.equal(parseExtra('Replace import old-package with new-package in src/index.ts')?.kind,'import-module');
 assert.equal(parseExtra('Remove console.log statements from src/index.ts')?.kind,'remove-console-log');
 assert.equal(parseExtra('Add *.log to .gitignore')?.kind,'gitignore-entry');
});
test('classify simple JSON, CSV and literal edits',()=>{
 assert.equal(parseExtra('Set enabled to false in data/config.json')?.kind,'json-field');
 assert.equal(parseExtra('Rename CSV column old_name to new_name in data/records.csv')?.kind,'csv-column');
 assert.equal(parseExtra('Replace literal "helloo" with "hello" in README.md')?.kind,'literal-replace');
});
test('do not infer vague work or accept path traversal',()=>{
 assert.equal(parseExtra('Build an OAuth app'),null);
 assert.equal(parseExtra('Replace literal "old" with "new" in docs/../config.md'),null);
 assert.equal(parseExtra('Set token to true in package.json'),null);
});
test('markdown link modifies only exact link targets',()=>{
 const spec=parseExtra('Fix broken markdown link https://old.example to https://new.example in README.md');
 const r=editContent('[Help](https://old.example)\ntext https://old.example\n',spec);
 assert.equal(r.count,1);
 assert.match(r.content,/\[Help\]\(https:\/\/new\.example\)/);
 assert.match(r.content,/text https:\/\/old\.example/);
});
test('markdown heading does not touch body text',()=>{
 const spec=parseExtra('Rename markdown heading "Intro" to "Overview" in docs/page.md');
 const r=editContent('# Intro\nIntro\n## Intro\n',spec);
 assert.equal(r.count,2);assert.equal(r.content,'# Overview\nIntro\n## Overview\n');
});
test('module import repair leaves unrelated plain strings untouched',()=>{
 const spec=parseExtra('Replace import old-pkg with new-pkg in src/main.ts');
 const r=editContent("import { x } from 'old-pkg';\nconst text = 'old-pkg';\n",spec);
 assert.equal(r.count,1);assert.match(r.content,/from 'new-pkg'/);
 assert.match(r.content,/text = 'old-pkg'/);
});
test('console log removes only simple standalone lines',()=>{
 const spec=parseExtra('Remove console.log from src/main.ts');
 const r=editContent('const a=1;\nconsole.log(a);\nif(a) console.log(a);\n',spec);
 assert.equal(r.count,1);assert.equal(r.content,'const a=1;\nif(a) console.log(a);\n');
});
test('json field creates valid JSON and retains other keys',()=>{
 const spec=parseExtra('Set enabled to false in data/config.json');
 const r=editContent('{"enabled":true,"count":3}\n',spec);
 assert.equal(r.count,1);assert.deepEqual(JSON.parse(r.content),{enabled:false,count:3});
 assert.throws(()=>editContent('{"x":1}',spec),/absent/);
});
test('CSV header updates once and leaves data identical',()=>{
 const spec=parseExtra('Rename CSV column fullname to name in data/list.csv');
 const r=editContent('id,fullname,age\r\n1,Ana,23\r\n',spec);
 assert.equal(r.count,1);assert.equal(r.content,'id,name,age\r\n1,Ana,23\r\n');
});
test('gitignore entry is idempotent and safely scoped',()=>{
 const spec=parseExtra('Add *.log to .gitignore');
 const r=editContent('node_modules/\n',spec);
 assert.equal(r.count,1);
 assert.equal(editContent(r.content,spec).count,0);
});
test('real repository file edit rejects absent file and writes a bounded fixture',()=>{
 const root=mkdtempSync(join(tmpdir(),'toyol-extra-'));
 try{
  mkdirSync(join(root,'data'));
  writeFileSync(join(root,'data','config.json'),'{"enabled":true}\n');
  const spec=parseExtra('Set enabled to false in data/config.json');
  assert.equal(applyExtra(root,spec).count,1);
  assert.equal(JSON.parse(readFileSync(join(root,'data','config.json'),'utf8')).enabled,false);
  assert.throws(()=>applyExtra(root,{...spec,path:'data/../../etc/passwd'}));
 }finally{rmSync(root,{recursive:true,force:true});}
});
