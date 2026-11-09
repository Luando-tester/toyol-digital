import test from 'node:test';
import assert from 'node:assert/strict';
import {checkPatchRequirements,enforcePatchRequirements} from '../src/semantic-check.mjs';

const title='Remove disableAutoFocus in favor of focusOnHover={false}';
const diff=(before,after)=>'diff --git a/src/component.tsx b/src/component.tsx\n--- a/src/component.tsx\n+++ b/src/component.tsx\n@@ -1 +1 @@\n-'+before+'\n+'+after+'\n';

test('reproduces actual Qwen error and rejects flipping false to true',()=>{
 const patch=diff('return <Widget focusOnHover={false} />','return <Widget focusOnHover={true} />');
 const verdict=checkPatchRequirements(title,patch);
 assert.equal(verdict.applicable,true);
 assert.equal(verdict.passed,false);
 assert.throws(()=>enforcePatchRequirements(title,patch),/issue requirement mismatch/);
});
test('accepts exact specified JSX replacement, not proof of full tests',()=>{
 const patch=diff('<Widget disableAutoFocus />','<Widget focusOnHover={false} />');
 const verdict=enforcePatchRequirements(title,patch);
 assert.equal(verdict.status,'EXPLICIT_INSTRUCTION_MATCH');
 assert.equal(verdict.passed,true);
 assert.match(verdict.reason,/Behavioral tests still required/);
});
test('rejects patch that retains forbidden old prop',()=>{
 const patch=diff('<Widget disableAutoFocus />','<Widget disableAutoFocus focusOnHover={false} />');
 assert.equal(checkPatchRequirements(title,patch).passed,false);
});
test('rename task requires actual removal and addition of correct identifier',()=>{
 const task='Rename oldProp to newProp';
 assert.equal(checkPatchRequirements(task,diff('oldProp','newProp')).passed,true);
 assert.equal(checkPatchRequirements(task,diff('fooProp','newProp')).passed,false);
});
test('unknown free-form requirements remain unverified rather than falsely passing',()=>{
 const r=enforcePatchRequirements('Implement full auth server',diff('a','b'));
 assert.equal(r.applicable,false);
 assert.equal(r.passed,false);
 assert.equal(r.status,'REQUIREMENTS_UNVERIFIED');
});
