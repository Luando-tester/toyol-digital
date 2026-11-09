import test from 'node:test';
import assert from 'node:assert/strict';
import {issueSymbols,findSourceBySymbols} from '../src/symbol-search.mjs';

test('extracts exact issue identifiers without arbitrary command arguments',()=>{
 const ids=issueSymbols('Remove disableAutoFocus in favor of focusOnHover={false}');
 assert.ok(ids.includes('disableAutoFocus'));
 assert.ok(ids.includes('focusOnHover'));
 assert.ok(!ids.includes('false'));
});
test('uses git grep with argument arrays and excludes unsafe paths',()=>{
 let calls=0;
 const result=findSourceBySymbols('/tmp/fixture','Remove disableAutoFocus in favor of focusOnHover={false}','',{
  git:(command,args,options)=>{
   assert.equal(command,'git');
   assert.deepEqual(args.slice(0,4),['grep','-l','-F','-e']);
   assert.equal(options.cwd,'/tmp/fixture');
   calls++;
   return 'src/Widget.tsx\npackages/ui/src/Input.tsx\n../exfil.tsx\n';
  }
 });
 assert.ok(calls>=1);
 assert.ok(result.paths.includes('src/Widget.tsx'));
 assert.ok(!result.paths.includes('../exfil.tsx'));
});
test('no technical identifiers means no blind repository grep',()=>{
 let called=false;
 const out=findSourceBySymbols('/tmp/none','Improve software reliability','',{
  git:()=>{called=true;throw Error('should not run');}
 });
 assert.equal(called,false);
 assert.equal(out.status,'NO_IDENTIFIERS');
});
test('missing search match records NOT_FOUND not a fabricated file',()=>{
 const result=findSourceBySymbols('/tmp/fixture','Fix disableAutoFocus','',{
  git:()=>{const e=new Error('not found');e.status=1;throw e;}
 });
 assert.equal(result.status,'NOT_FOUND');
 assert.deepEqual(result.paths,[]);
});
