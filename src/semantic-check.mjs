/**
 * Semantic guard for the deterministic instructions Toyol understands.
 * This does NOT prove project correctness, but rejects patches that plainly
 * contradict an explicit requirement. Unknown tasks stay unverified.
 */
import {parseInstruction} from './skills.mjs';
const escaped=s=>[...String(s)].map(ch=>'\\.^$*+?()[]{}|'.includes(ch)?'\\'+ch:ch).join('');
const word=s=>new RegExp('(^|[^A-Za-z0-9_$])'+escaped(s)+'(?![A-Za-z0-9_$])');

export function checkPatchRequirements(title,diff){
 const task=parseInstruction(title);
 if(!task)return {applicable:false,passed:false,status:'REQUIREMENTS_UNVERIFIED',
  reason:'No machine-checkable explicit instruction; independent project tests required.'};
 if(typeof diff!=='string'||!diff.startsWith('diff --git '))
  return {applicable:true,passed:false,status:'REQUIREMENT_MISMATCH',reason:'no valid diff'};
 const lines=diff.split(/\r?\n/);
 const added=lines.filter(x=>x.startsWith('+')&&!x.startsWith('+++')).map(x=>x.slice(1));
 const removed=lines.filter(x=>x.startsWith('-')&&!x.startsWith('---')).map(x=>x.slice(1));
 const from=word(task.from),to=word(task.to);
 let passed=false,reason='';
 if(task.kind==='jsx-boolean-prop'){
  const correct=new RegExp('(^|[^A-Za-z0-9_$])'+escaped(task.to)+'\\s*=\\s*\\{\\s*'+task.bool+'\\s*\\}');
  const wrongBool=new RegExp('(^|[^A-Za-z0-9_$])'+escaped(task.to)+'\\s*=\\s*\\{\\s*'+(task.bool==='true'?'false':'true')+'\\s*\\}');
  passed=removed.some(x=>from.test(x))&&added.some(x=>correct.test(x))&&
    !added.some(x=>from.test(x)||wrongBool.test(x));
  reason='Expected removal of '+task.from+' and addition of '+task.to+'={'+task.bool+'}; not a flip of an existing value.';
 }else{
  passed=removed.some(x=>from.test(x))&&added.some(x=>to.test(x))&&!added.some(x=>from.test(x));
  reason='Expected removal of '+task.from+' and replacement by '+task.to+' in the patch.';
 }
 return {applicable:true,passed,status:passed?'EXPLICIT_INSTRUCTION_MATCH':'REQUIREMENT_MISMATCH',
  kind:task.kind,reason:passed?'Patch contains the required explicit textual transformation. Behavioral tests still required.':reason};
}
export function enforcePatchRequirements(title,diff){
 const result=checkPatchRequirements(title,diff);
 if(result.applicable&&!result.passed)throw Error('issue requirement mismatch: '+result.reason);
 return result;
}
