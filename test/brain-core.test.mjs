import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {safeFile,collectContext,makeMessages,parseProposal,applyProposal,queryLocalModel} from '../src/brain-core.mjs';

function fixture(fn){
 const root=mkdtempSync(join(tmpdir(),'toyol-brain-'));
 mkdirSync(join(root,'src'));
 writeFileSync(join(root,'src','calc.js'),'export function add(a, b) { return a - b; }\n');
 try{return fn(root);}finally{rmSync(root,{recursive:true,force:true});}
}
test('rejects unlisted, traversal and privileged files',()=>{
 for(const name of ['../secrets.env','.github/workflows/malicious.yml','src/../../README.md','README.md/../X','/etc/passwd','src/.secrets.js'])assert.equal(safeFile(name),false);
 assert.equal(safeFile('src/calc.js'),true);
 assert.equal(safeFile('README.md'),true);
});
test('builds untrusted task prompt with narrow output schema',()=>{
 const messages=makeMessages('Fix addition',{ 'src/calc.js':'export function add(a,b){return a-b;}'});
 assert.equal(messages.length,2);
 assert.match(messages[0].content,/strict JSON/);
 assert.match(messages[1].content,/src\/calc.js/);
});
test('accepts only small structured code edits',()=>{
 const obj=parseProposal('{"edits":[{"path":"src/calc.js","search":"return a - b;","replace":"return a + b;"}]}');
 assert.equal(obj.edits.length,1);
 assert.throws(()=>parseProposal('{"edits":[{"path":"../../x.js","search":"abc","replace":"xyz"}]}'),/unsafe/);
 assert.throws(()=>parseProposal('{"edits":[{"path":"src/calc.js","search":"return a - b;","replace":"eval(1)"}]}'),/suspicious/);
 assert.throws(()=>parseProposal('{"edits":[],"paid":true}'),/unexpected/);
});
test('applies exact unique model patch with syntax check',()=>fixture(root=>{
 const source=collectContext(root,['src/calc.js']);
 const proposal=parseProposal('{"edits":[{"path":"src/calc.js","search":"return a - b;","replace":"return a + b;"}]}');
 const result=applyProposal(root,source,proposal);
 assert.deepEqual(result.files,['src/calc.js']);
 assert.match(readFileSync(join(root,'src','calc.js'),'utf8'),/return a \+ b;/);
 assert.equal(result.validation[0].result,'pass');
}));
test('does not trust nonunique search or stale file',()=>fixture(root=>{
 const source=collectContext(root,['src/calc.js']);
 assert.throws(()=>applyProposal(root,source,{edits:[{path:'src/calc.js',search:'a',replace:'z'}]}),/nonunique/);
 writeFileSync(join(root,'src','calc.js'),'const different=2;');
 assert.throws(()=>applyProposal(root,source,{edits:[{path:'src/calc.js',search:'return a - b;',replace:'return a + b;'}]}),/changed since/);
}));
test('invalid syntax is rolled back',()=>fixture(root=>{
 const source=collectContext(root,['src/calc.js']);
 assert.throws(()=>applyProposal(root,source,{edits:[{path:'src/calc.js',search:'return a - b;',replace:'return {'}]}),/syntax check failed/);
 assert.equal(readFileSync(join(root,'src','calc.js'),'utf8'),source['src/calc.js']);
}));
test('talks only to a localhost model, accepts mocked JSON response',async()=>{
 const response=await queryLocalModel([{role:'user',content:'test'}],{
   fetchFn:async()=>({ok:true,json:async()=>({choices:[{message:{content:'{"edits":[]}'} }]})})
 });
 assert.deepEqual(response,{edits:[]});
 await assert.rejects(()=>queryLocalModel([],{endpoint:'https://example.com/v1/chat/completions'}),/local/);
});
