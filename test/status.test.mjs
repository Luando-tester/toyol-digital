import test from 'node:test';
import assert from 'node:assert/strict';
import {formatStatus,mergeStatus} from '../src/status.mjs';

test('shows honest progress and source trigger',()=>{
 const report={checked:1,found:false,failures:[{url:'https://example.com',reason:'contested / closed issue'}],earned_amount:0};
 const s=formatStatus(report,{event:'schedule',runId:'123',time:'2026-11-08T10:00:00Z'});
 assert.match(s,/schedule \(cron\)/);
 assert.match(s,/RM0/);
 assert.match(s,/Patch luar dihasilkan: \*\*0\*\*/);
 assert.match(s,/contested/);
 assert.match(s,/actions\/runs\/123/);
});
test('never claims paid or submitted for a prepared patch',()=>{
 const s=formatStatus({checked:1,found:true,issue:'https://github.com/acme/demo/issues/12'},{event:'push'});
 assert.match(s,/PATCH DALAMAN UNTUK SEMAKAN/);
 assert.match(s,/Patch diserahkan: \*\*0\*\*/);
 assert.match(s,/Pendapatan disahkan: \*\*RM0\*\*/);
});
test('replaces prior status rather than duplicating it',()=>{
 const a=formatStatus({checked:0,found:false},{event:'push'});
 const b=formatStatus({checked:1,found:false},{event:'schedule'});
 const merged=mergeStatus(mergeStatus('<!-- toyol-radar-v1 -->\n# RADAR',a),b);
 assert.equal(merged.split('<!-- toyol-stage2-status -->').length,2);
 assert.doesNotMatch(merged,/push \(perubahan kod\)/);
 assert.match(merged,/schedule \(cron\)/);
});

test('displays market gap without claiming advertised payouts',()=>{
  const t=formatStatus({checked:1,found:false},{
    event:'schedule',
    audit:{total_feed_items:657,passed_initial_safety_filters:273,matching_automated_skills:1}
  });
  assert.match(t,/Tugasan diindeks: \*\*657\*\*/);
  assert.match(t,/Serasi dengan kemahiran Toyol: \*\*1\*\*/);
  assert.match(t,/Jurang besar/);
  assert.match(t,/Pendapatan disahkan: \*\*RM0\*\*/);
});

test('quest board distinguishes extra skills and provisional source inspection from earnings',()=>{
 const s=formatStatus({checked:2,found:false,failures:[]},{
   audit:{total_feed_items:659,passed_initial_safety_filters:273,matching_automated_skills:1},
   intel:{sources_checked:4,conditional_candidates:1,competitive_candidates:1,needs_verification:0,rejected:2,unverified:1},
   event:'workflow_dispatch'
 });
 assert.match(s,/Kemahiran pembetulan khusus dipasang: \*\*11\*\*/);
 assert.match(s,/Calon boleh dicuba secara terhad: \*\*1\*\*/);
 assert.match(s,/Calon dengan persaingan \(bukan automatik gugur\): \*\*1\*\*/);
 assert.match(s,/Disekat oleh syarat keselamatan\/kelayakan: \*\*2\*\*/);
 assert.match(s,/Pendapatan disahkan: \*\*RM0\*\*/);
});
