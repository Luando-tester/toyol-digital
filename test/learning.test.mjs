import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyLedger,parseLedger,serializeLedger,recordLearning,learningAdvice,rankWithMemory} from '../src/learning.mjs';

const url=n=>'https://github.com/acme/demo/issues/'+n;
test('learning ledger survives own GitHub issue body roundtrip, no raw prompts',()=>{
 const l=recordLearning(emptyLedger(),{evaluated:[{url:url(3),category:'REPAIRABLE_MODEL_OUTPUT',reason:'a secret that must not be persisted',attempts:[{},{}]}]},7);
 const s=serializeLedger('# Learning board\n',l);
 const parsed=parseLedger(s);
 assert.equal(parsed.runs[0].attempt_count,2);
 assert.doesNotMatch(s,/secret that must not be persisted/);
 assert.equal(parsed.runs[0].url,url(3));
});
test('two repeated model errors require a changed diagnosis, not permanent abandonment',()=>{
 let l=emptyLedger();
 for(const n of [4,5])l=recordLearning(l,{evaluated:[{url:url(3),category:'REPAIRABLE_MODEL_OUTPUT',attempts:[{},{}]}]},n);
 const feedback=learningAdvice(url(3),l);
 assert.equal(feedback.stage,'CHANGE_DIAGNOSIS');
 assert.ok(feedback.priority_adjustment<0);
 assert.ok(feedback.priority_adjustment>-100);
});
test('competition is not memorized as a reason to abandon work',()=>{
 const l=recordLearning(emptyLedger(),{evaluated:[{url:url(3),category:'COMPETITION_TO_ANALYZE'}]},3);
 const p=learningAdvice(url(3),l);
 assert.equal(p.stage,'EXPLORE_OR_COMPETE');
 assert.equal(p.priority_adjustment,0);
});
test('previous local draft triggers review instead of repetitive compute',()=>{
 const l=recordLearning(emptyLedger(),{status:'AI_DRAFT_CREATED_NOT_SUBMITTED',issue:url(8),attempts:[{},{}]},6);
 assert.equal(learningAdvice(url(8),l).stage,'REVIEW_EXISTING_DRAFT');
});
test('duplicate run events do not inflate learning counts',()=>{
 const x={evaluated:[{url:url(3),category:'UNCLASSIFIED'}]};
 let l=recordLearning(emptyLedger(),x,7);
 l=recordLearning(l,x,7);
 assert.equal(l.runs.length,1);
});
test('learning changes review order, never claims more money',()=>{
 let l=emptyLedger();
 for(const n of [2,3])l=recordLearning(l,{evaluated:[{url:url(3),category:'REPAIRABLE_MODEL_OUTPUT',attempts:[{},{}]}]},n);
 const items=[{issue_url:url(3),review_priority_points:70},{issue_url:url(4),review_priority_points:60}];
 const ranked=rankWithMemory(items,l,2);
 assert.equal(ranked[0].issue_url,url(4));
 assert.equal(ranked[1].learning.stage,'CHANGE_DIAGNOSIS');
});
test('invalid ledger and unsafe URLs cannot be injected into public log',()=>{
 assert.deepEqual(parseLedger('invalid'),emptyLedger());
 const l=recordLearning(emptyLedger(),{evaluated:[{url:'https://evil.test/exfil',category:'HARD_STOP'}]},3);
 assert.equal(l.runs.length,0);
});

test('invalidated external draft is not misclassified as progress',()=>{
 const body='<!-- toyol-learning-v1 -->\n{"version":1,"runs":[{"run":8,"url":"https://github.com/tscircuit/pcb-viewer/issues/163","outcome":"INVALID_DRAFT","category":"REPAIRABLE_MODEL_OUTPUT","attempt_count":2}]}\n<!-- /toyol-learning-v1 -->';
 const l=parseLedger(body);
 const a=learningAdvice('https://github.com/tscircuit/pcb-viewer/issues/163',l);
 assert.equal(a.stage,'CHANGE_DIAGNOSIS');
 assert.equal(a.invalidated_drafts,1);
});
