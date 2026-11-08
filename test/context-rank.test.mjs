import test from 'node:test';
import assert from 'node:assert/strict';
import {rankEvidence,chooseEvidence} from '../src/context-rank.mjs';
import {readableFile,safeFile,parseProposal} from '../src/brain-core.mjs';

test('precise issue path beats loosely similar repo files',()=>{
 const paths=['src/ledger.mjs','src/queue.mjs','src/taxes.mjs','tests/ledger.test.mjs','README.md'];
 const r=chooseEvidence(paths,'Fix duplicate transaction IDs','A regression appears in src/ledger.mjs when a transaction is retried.');
 assert.equal(r.paths[0],'src/ledger.mjs');
 assert.ok(!r.paths.includes('src/queue.mjs'));
});
test('issue without source clues abstains instead of sending random files to model',()=>{
 const r=chooseEvidence(['src/alpha.js','src/beta.js','README.md'],'Improve reliability','Please investigate and improve the system.');
 assert.equal(r.reason,'NO_RELEVANT_EDITABLE_SOURCE');
 assert.deepEqual(r.paths,[]);
});
test('test files may be read as evidence, but are never editable',()=>{
 const r=chooseEvidence(['src/parser.js','tests/parser.test.js','src/other.js'],'Fix parser bug','The parser mishandles missing values in src/parser.js.');
 assert.ok(r.paths.includes('src/parser.js'));
 assert.ok(r.paths.includes('tests/parser.test.js'));
 assert.equal(readableFile('tests/parser.test.js'),true);
 assert.equal(safeFile('tests/parser.test.js'),false);
 assert.throws(()=>parseProposal('{"edits":[{"path":"tests/parser.test.js","search":"expect(1)","replace":"expect(0)"}]}'),/unsafe/);
});
test('generic words do not trick source relevance scoring',()=>{
 const ranked=rankEvidence(['src/anything.js','src/other.js'],'Fix bug','Please update the code for this issue.');
 assert.deepEqual(ranked,[]);
});
