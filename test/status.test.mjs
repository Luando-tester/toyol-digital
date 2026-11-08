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
