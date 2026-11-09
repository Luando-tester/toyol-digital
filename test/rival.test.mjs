import test from 'node:test';
import assert from 'node:assert/strict';
import {rivalCandidates,summarizeRival,contrastPatch,investigateRivals} from '../src/rival.mjs';
const issue='https://github.com/acme/demo/issues/42';
const prs=[
 {number:5,title:'Fix #42 parser bug',body:'Implementation',state:'open',html_url:'https://github.com/acme/demo/pull/5'},
 {number:6,title:'Fix #420 unrelated',body:'',state:'open',html_url:'https://github.com/acme/demo/pull/6'},
 {number:7,title:'Addresses issue 42',body:'see /issues/42',state:'open',html_url:'https://github.com/acme/demo/pull/7'}
];
test('only genuine issue references count as competing PR evidence',()=>{
 const x=rivalCandidates(issue,prs,2);
 assert.deepEqual(x.map(p=>p.number),[5,7]);
});
test('visible test filenames are not falsely reported as passing tests',()=>{
 const p=summarizeRival(prs[0],[
  {filename:'src/parser.js'},{filename:'tests/parser.test.js'}
 ]);
 assert.equal(p.tests_added_or_modified,true);
 assert.equal(p.test_execution_evidence,'NOT_VERIFIED');
 assert.equal(p.correctness,'NOT_VERIFIED');
});
test('same-file overlap cannot establish which competing fix is better',()=>{
 const r=summarizeRival(prs[0],[{filename:'src/parser.js'}]);
 const x=contrastPatch(['src/parser.js'],[r]);
 assert.deepEqual(x.overlaps[0].common_paths,['src/parser.js']);
 assert.equal(x.verdict,'CORRECTNESS_COMPARISON_REQUIRES_INDEPENDENT_TESTS');
});
test('rival inspection is bounded to two read-only GitHub PR file lookups',async()=>{
 let calls=0;
 const result=await investigateRivals(issue,prs,async path=>{
  assert.match(path,/\/pulls\/[57]\/files\?per_page=60$/);
  calls++;return [{filename:'src/parser.js'}];
 });
 assert.equal(calls,2);
 assert.equal(result.rivals.length,2);
});
test('rival API failure is recorded as unverified rather than as superiority',async()=>{
 const r=await investigateRivals(issue,[prs[0]],async()=>{throw Error('HTTP 403');});
 assert.equal(r.rivals[0].inspection,'UNAVAILABLE');
 assert.equal(r.rivals[0].correctness,'NOT_VERIFIED');
});
