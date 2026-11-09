import test from 'node:test';
import assert from 'node:assert/strict';
import {understandSituation,chooseBoardOpportunities,composeRepairTask} from '../src/situation.mjs';
import {emptyLedger,recordLearning} from '../src/learning.mjs';

const u=n=>'https://github.com/acme/demo/issues/'+n;
const line=(id,title,amount)=>'### '+id+'. '+title+'\n- Sumber asal: '+u(id)+
 '\n- Ganjaran diiklankan: '+amount+' USD\n- Board: algora | gred indeks: B | status dana: escrowed'+
 '\n- Penerimaan: human-review\n- Ringkasan: '+title+'\n\n';

test('situational diagnosis gives rival analysis without declaring competitor failure',()=>{
 const r=understandSituation({title:'Fix parser bug'},{title:'Fix parser bug',body:'Expected parser to return valid JSON; add tests.'},{
  can_prepare_draft:true,competition:{competitive:true}});
 assert.equal(r.problem_kind,'DATA_TRANSFORMATION');
 assert.ok(r.strategies.some(x=>x.id==='RIVAL_GAP_ANALYSIS'));
 assert.equal(r.acceptance_verified,false);
});
test('external-human dependent opportunities are not treated as code-fix quick wins',()=>{
 const r=understandSituation({title:'Add conference data'},{body:'Interview organizer and collect private meeting information.'},{
  can_prepare_draft:true});
 assert.equal(r.recommended_strategy,'ABSTAIN_OR_RESEARCH');
 assert.ok(r.blocking_unknowns.some(s=>s.includes('human-dependent')));
});
test('model prompt describes strategy and does not claim a complete solution',()=>{
 const s=understandSituation({title:'Fix README typo'},{title:'Fix README typo',body:'Expected README spelling fix.'},{can_prepare_draft:true});
 const task=composeRepairTask({title:'Fix README typo',body:'Expected README spelling fix.'},s);
 assert.match(task,/APPROACH FOR LOCAL DRAFT/);
 assert.match(task,/return \{"edits":\[\]\}/);
 assert.ok(task.length<=1600);
});
test('board triage prioritizes feasible small work and keeps an exploration slot',()=>{
 const board='# Bounties\n'+[
  line(1,'Fix README typo',2),
  line(2,'Build full stack video call architecture',200),
  line(3,'Fix parser error',4),
  line(4,'Fix JSON schema bug',5),
  line(5,'Integrate external OAuth payment gateway',100),
  line(6,'Fix documentation spelling',1)
 ].join('');
 const shortlist=chooseBoardOpportunities(board,emptyLedger(),1,5);
 assert.equal(shortlist.length,5);
 assert.ok([u(3),u(4)].includes(shortlist[0].url),'a bounded repair outranks a vague high-dollar platform build');
 assert.equal(shortlist[0].money_grade,'ADVERTISED_ONLY');
 assert.ok(shortlist.some(x=>x.url===u(1)));
 assert.ok(shortlist.some(x=>x.screening_effort==='COMPLEX'||x.screening_effort==='EXTERNAL_DEPENDENCY'));
});
test('repeated source failures change what gets sampled without permanent blacklisting',()=>{
 let ledger=emptyLedger();
 for(const run of [1,2,3])ledger=recordLearning(ledger,{evaluated:[{url:u(4),category:'REPAIRABLE_MODEL_OUTPUT',attempts:[{},{}]}]},run);
 const board=line(4,'Fix README typo',3)+line(5,'Fix README typo',2)+line(6,'Fix README typo',1)+line(7,'Fix README typo',1)+line(8,'Fix README typo',1)+line(9,'Fix README typo',1);
 const x=chooseBoardOpportunities(board,ledger,2,5);
 assert.equal(x.length,5);
 const older=x.find(y=>y.url===u(4));
 if(older)assert.equal(older.learning.stage,'CHANGE_DIAGNOSIS');
 assert.ok(x.every(y=>y.Malaysia_cashout_verified===false));
});
