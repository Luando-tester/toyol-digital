import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate,inspect,render,sampleTasks} from '../src/quest-intel.mjs';

const issue=(overrides={})=>({
 state:'open',locked:false,comments:0,assignees:[],assignee:null,
 title:'Fix a bug',body:'Fix the broken parser output. Acceptance: verified test fixture.',
 labels:[{name:'bounty'}],updated_at:'2026-11-08T00:00:00Z',...overrides
});
const gig=(title='Fix some parser output')=>({
 id:'algora:1',title,url:'https://github.com/example/sample/issues/23',
 content_text:'Fix a parser bug with a reproducible test.',
 _jobbi:{lane:'agent',reward:{amount:250,currency:'USD'},payment_state:'escrowed',payout_grade:'B',source:'algora',claims_open:true}
});
const NOW=Date.parse('2026-11-08T12:00:00Z');
test('original issue can pass only provisional public checks',()=>{
 const result=evaluate(issue(),[],{archived:false,private:false},NOW);
 assert.equal(result.pass,true);
 assert.equal(result.decision,'TRY_CONSTRAINED_FIX');
 assert.deepEqual(result.reasons,[]);
});
test('competitor claims trigger competing with evidence, not automatic refusal',()=>{
 const r=evaluate(issue({comments:1}),[{body:'/claim https://github.com/example/sample/pull/50'}],{},NOW);
 assert.equal(r.pass,true);
 assert.equal(r.decision,'COMPETE_WITH_BETTER_EVIDENCE');
 assert.equal(r.competition.explicit_claims,1);
});
test('meaningful human contribution and deposit needs are disqualifying',()=>{
 const r=evaluate(issue({body:'Acceptance: meaningful human contribution required. Deposit to start.'}),[],{},NOW);
 assert.equal(r.pass,false);
 assert.ok(r.reasons.some(x=>x.includes('human')));
 assert.ok(r.reasons.some(x=>x.includes('payment')));
});
test('stale or unlabeled issue does not count as verified bounty',()=>{
 const r=evaluate(issue({labels:[],body:'A code improvement with full tests',updated_at:'2024-01-01T00:00:00Z'}),[],{},NOW);
 assert.equal(r.pass,false);
 assert.ok(r.reasons.some(x=>x.includes('reward not independently visible')));
 assert.ok(r.reasons.some(x=>x.includes('stale')));
});
test('quest inspector uses read-only injectable GitHub requests',async()=>{
 const mock=async(path)=>{
  if(path.endsWith('/issues/23'))return issue();
  if(path.endsWith('/sample'))return {archived:false};
  if(path.includes('/pulls?'))return [];
  throw Error('unexpected request');
 };
 const a=await inspect([gig()],{githubGet:mock,now:NOW});
 assert.equal(a.sources_checked,1);
 assert.equal(a.conditional_candidates,1);
 assert.equal(a.competitive_candidates,0);
 assert.equal(a.earned_amount_verified,0);
 assert.match(render(a),/Income verified: \*\*RM0\*\*/);
});
test('API problems remain explicitly unverified',async()=>{
 const a=await inspect([gig()],{githubGet:async()=>{throw Error('HTTP 403');},now:NOW});
 assert.equal(a.unverified,1);
 assert.equal(a.conditional_candidates,0);
});
