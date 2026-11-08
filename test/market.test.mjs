import test from 'node:test';
import assert from 'node:assert/strict';
import { audit, report } from '../src/market.mjs';

const item=(id,title,url,source='algora')=>({
 id,
 title,
 url,
 content_text:'Fix a clear paid issue in a public repository.',
 _jobbi:{
   lane:'agent', reward:{amount:2,currency:'USD'},source,
   payment_state:'escrowed',claims_open:true,acceptance_type:'human-review'
 }
});
test('market audit distinguishes indexed tasks from solver-compatible tasks',()=>{
 const list=[
  item('a','Rename oldProp to newProp','https://github.com/example/demo/issues/23'),
  item('b','Implement a complex architecture change','https://github.com/example/demo/issues/25'),
  item('c','Deposit to receive payout','https://github.com/example/demo/issues/26')
 ];
 const a=audit(list,Date.parse('2026-11-08T00:00:00Z'));
 assert.equal(a.total_feed_items,3);
 assert.equal(a.passed_initial_safety_filters,2);
 assert.equal(a.github_bounty_source_links,2);
 assert.equal(a.matching_automated_skills,1);
 assert.equal(a.earned_amount_verified,0);
});
test('market fit report explicitly says no earnings or false completion',()=>{
 const a=audit([item('c','A complex task outside skills','https://github.com/example/demo/issues/99')]);
 const text=report(a);
 assert.match(text,/No tasks in this feed match/);
 assert.match(text,/Verified income: \*\*RM0\*\*/);
});
