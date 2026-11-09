/**
 * Rival Evidence: compare observable PR scope with issue and own patch.
 * Never declare a rival's work correct/incorrect from PR metadata alone.
 */
const ISSUE=/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/issues\/([1-9]\d*)$/;
const PATH=/^[A-Za-z0-9_./-]{1,180}$/;
export function rivalCandidates(issueUrl,pulls,max=2){
 const m=ISSUE.exec(issueUrl||'');
 if(!m)return [];
 const n=m[3];
 const ref=new RegExp('(?:#'+n+'\\b|/issues/'+n+'\\b)','i');
 return (Array.isArray(pulls)?pulls:[])
  .filter(p=>p.state==='open'&&Number.isInteger(p.number)&&p.number>0&&
   ref.test(String(p.title||'')+' '+String(p.body||'')))
  .slice(0,Math.max(1,Math.min(2,max)));
}
export function summarizeRival(pr,files=[]){
 const rows=Array.isArray(files)?files:[];
 const paths=rows.map(f=>f.filename).filter(x=>typeof x==='string'&&PATH.test(x)&&!x.includes('..')).slice(0,60);
 const testPaths=paths.filter(p=>/(^|\/)(test|tests|__tests__)(\/|$)|\.(?:test|spec)\./i.test(p));
 return {
  pr_number:pr.number,url:pr.html_url||null,
  changed_file_count:Number.isFinite(pr.changed_files)?pr.changed_files:rows.length,
  visible_paths:paths,
  test_paths:testPaths,
  tests_added_or_modified:testPaths.length>0,
  test_execution_evidence:'NOT_VERIFIED',
  acceptance_evidence:'NOT_VERIFIED',
  correctness:'NOT_VERIFIED',
  note:'File changes and test filenames are visible signals, not proof tests passed.'
 };
}
export function contrastPatch(ownFiles,rivals){
 const own=(Array.isArray(ownFiles)?ownFiles:[]).filter(p=>typeof p==='string');
 return {comparison_scope:'FILE_OVERLAP_ONLY',
  rivals_considered:rivals.length,
  overlaps:rivals.map(r=>({pr_number:r.pr_number,
   common_paths:own.filter(p=>r.visible_paths.includes(p))})),
  verdict:'CORRECTNESS_COMPARISON_REQUIRES_INDEPENDENT_TESTS',
  next_step:'Reproduce expected behavior and evaluate differences, not just file names'};
}
export async function investigateRivals(issueUrl,pulls,fetchFn,{max=2}={}){
 const m=ISSUE.exec(issueUrl||'');
 if(!m)return {status:'INVALID_ISSUE',rivals:[],coverage:'NONE'};
 const selected=rivalCandidates(issueUrl,pulls,max),out=[];
 for(const pr of selected){
  try{
   const files=await fetchFn('/repos/'+m[1]+'/'+m[2]+'/pulls/'+pr.number+'/files?per_page=60');
   if(!Array.isArray(files))throw Error('invalid PR files response');
   out.push(summarizeRival(pr,files));
  }catch{out.push({pr_number:pr.number,url:pr.html_url||null,
   correctness:'NOT_VERIFIED',inspection:'UNAVAILABLE'});}
 }
 return {status:selected.length?'RIVAL_METADATA_INSPECTED':'NO_LINKED_OPEN_PR_IN_SAMPLE',
  rivals:out,coverage:'UP_TO_2_LINKED_OPEN_PRS_ONLY',
  no_quality_claim:true};
}
