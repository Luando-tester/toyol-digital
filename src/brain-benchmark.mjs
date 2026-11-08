/**
 * Toyol AI Quality Benchmark v0.8
 * Three unseen behavioral acceptance suites. AI may edit ONLY curated source.
 * AI-produced code is executed ONLY in an isolated, unprivileged, offline
 * Docker container with read-only mounts and no credentials. Never run
 * this executor on arbitrary downloaded third-party repositories.
 */
import {cpSync,mkdtempSync,rmSync,readFileSync,writeFileSync,mkdirSync,appendFileSync,existsSync,chmodSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {collectContext,makeMessages,queryLocalModel,applyProposal,safeFile} from './brain-core.mjs';
import {chooseEvidence} from './context-rank.mjs';
import {collectPatch} from './worker.mjs';

export const scenarios=Object.freeze([
 {name:'deduplicate',source:'src/uniqueIds.mjs',
  task:'Fix uniqueIds in src/uniqueIds.mjs. It currently returns duplicates instead of keeping the first record of each id. Return the unique input records in their original order. Empty input should return empty; do not mutate input.'},
 {name:'pagination',source:'src/page.mjs',
  task:'Fix parsePage in src/page.mjs. It must parse an input page number, return an integer from 1 through 100 inclusive, clamp higher values at 100, floor fractional values, and use 1 for invalid or nonfinite input.'},
 {name:'slug',source:'src/slug.mjs',
  task:'Fix toSlug in src/slug.mjs. A URL slug should trim leading and trailing spaces, use lowercase and replace each run of whitespace with one hyphen (not underscore). Preserve punctuation. The empty string should remain empty.'}
]);
const manifestBase={disclosure:'All cases are controlled fixtures, not paid external bounty completions.',actual_paid_bounties_accepted:0,earned_amount_verified:0};

function git(args,dir){
 return execFileSync('git',args,{cwd:dir,encoding:'utf8',timeout:12000,stdio:'pipe'}).trim();
}
function createSandbox(name){
 const work=mkdtempSync(join(tmpdir(),'toyol-quality-'+name+'-'));
 cpSync(resolve('benchmarks',name),work,{recursive:true});
 // The offline test runner uses an unprivileged UID; grant read/traverse of this controlled fixture directory only.
 chmodSync(work,0o755);
 git(['init','--quiet'],work);
 git(['add','src','tests'],work);
 git(['-c','user.name=ToyolBenchmark','-c','user.email=benchmark@example.invalid','commit','--quiet','-m','controlled baseline'],work);
 return work;
}
export function feedbackMessage(message){
 const m=String(message||'').replace(/\x1b\[[0-9;]*m/g,'').replace(/[\x00-\x08\x0e-\x1f]/g,' ');
 return m.slice(-1200);
}
export function runIsolatedTests(dir,{run=execFileSync}={}){
 const args=[
  'run','--rm','--network','none','--read-only',
  '--cap-drop','ALL','--security-opt','no-new-privileges',
  '--pids-limit','64','--memory','384m','--cpus','1',
  '--user','65534:65534','--mount','type=bind,src='+dir+',dst=/work,readonly',
  '--workdir','/work','node:22-alpine',
  'node','--test','tests/acceptance.test.mjs'
 ];
 try{
  const stdout=run('docker',args,{encoding:'utf8',timeout:45000,maxBuffer:300000,stdio:'pipe'});
  return {pass:true,feedback:feedbackMessage(stdout).slice(-350)};
 }catch(e){
  if(e.code==='ENOENT')return {pass:false,infra:true,feedback:'Docker is not installed'};
  if(e.killed)return {pass:false,infra:true,feedback:'isolated test runner timeout'};
  const stdout=String(e.stdout||'');
  const details=String(e.stderr||'')+'\n'+stdout+'\n'+String(e.message||'');
  const keyLines=stdout.split('\n').filter(x=>/not ok |actual:|expected:|failureType:|error:|# fail /i.test(x)).slice(0,14).join('\n');
  if(/Could not find ['\"]?tests\/acceptance\.test\.mjs|EACCES|permission denied|Cannot connect to the Docker daemon|pull access denied/i.test(details))
   return {pass:false,infra:true,feedback:'isolated benchmark fixture or container inaccessible'};
  return {pass:false,feedback:feedbackMessage(keyLines||details)};
 }
}

export async function solveScenario(scenario,{
  model=queryLocalModel,
  testRunner=runIsolatedTests,
  maxAttempts=2
}={}){
 const started=Date.now();
 const result={scenario:scenario.name,status:'UNVERIFIED',attempts:[],...manifestBase};
 const root=createSandbox(scenario.name);
 try{
  const fileChoices=chooseEvidence([scenario.source,'tests/acceptance.test.mjs'],scenario.task);
  const selected=fileChoices.paths.filter(safeFile);
  if(!selected.includes(scenario.source))throw Error('cannot identify relevant source');
  const original=collectContext(root,[scenario.source]);
  let feedback='';
  for(let n=1;n<=Math.min(2,Math.max(1,maxAttempts));n++){
   writeFileSync(join(root,scenario.source),original[scenario.source]);
   const messages=makeMessages(scenario.task,original);
   if(feedback)messages.push({role:'user',content:'Previous attempt failed independent acceptance tests. Their diagnostic summary follows. Propose a different minimal edit AGAINST THE ORIGINAL SOURCE, not the previous modified file. Test files are private and must never be edited. Feedback:\n'+feedback});
   let entry={attempt:n,proposal:'not_generated'};
   try{
    const proposal=await model(messages,{onRaw:raw=>{entry.model_output_excerpt=feedbackMessage(raw).slice(0,750);}});
    entry.proposal=proposal?.edits?.length ? 'candidate' : 'abstained';
    entry.search_previews=(proposal?.edits||[]).map(e=>({path:e.path,search:String(e.search).slice(0,250),replace:String(e.replace).slice(0,250)}));
    if(!proposal?.edits?.length)throw Error('model chose no solution');
    const patch=applyProposal(root,original,proposal);
    entry.static_checks=patch.validation;
    const trial=await testRunner(root);
    entry.isolated_tests=trial.pass?'PASS':trial.infra?'INFRA_UNVERIFIED':'FAIL';
    if(!trial.pass){
     feedback=feedbackMessage(trial.feedback||'acceptance test failure');
     throw Error(trial.infra?'test infrastructure unavailable':feedback);
    }
    const diff=collectPatch(root);
    if(!diff.includes('diff --git a/'+scenario.source+' b/'+scenario.source)||diff.length>12000)throw Error('patch missing or oversized');
    mkdirSync('out/brain/benchmarks',{recursive:true});
    writeFileSync('out/brain/benchmarks/'+scenario.name+'.patch',diff+'\n');
    result.status='BEHAVIORAL_TESTS_PASS_IN_OFFLINE_SANDBOX';
    result.patch_sha256=createHash('sha256').update(diff).digest('hex');
    result.edited_files=patch.files;
    result.attempts.push(entry);
    break;
   }catch(err){
    entry.reason=feedbackMessage(err.message).slice(-850);
    result.attempts.push(entry);
    if(entry.isolated_tests==='INFRA_UNVERIFIED'){result.status='INFRA_UNVERIFIED';break;}
    feedback=feedbackMessage(entry.reason);
   }
  }
  if(result.status==='UNVERIFIED')result.status='BEHAVIORAL_TESTS_NOT_PASSED';
 }catch(error){
  result.status='SCENARIO_UNAVAILABLE';
  result.error=feedbackMessage(error.message).slice(0,150);
 }finally{
  result.duration_ms=Date.now()-started;
  rmSync(root,{recursive:true,force:true});
 }
 return result;
}

export function score(results){
 const total=results.length;
 const passed=results.filter(x=>x.status==='BEHAVIORAL_TESTS_PASS_IN_OFFLINE_SANDBOX').length;
 const firstTry=results.filter(x=>x.status==='BEHAVIORAL_TESTS_PASS_IN_OFFLINE_SANDBOX'&&x.attempts?.length===1).length;
 return {total,passed,firstTry,failed:total-passed,success_rate:total?Math.round(passed/total*100):0};
}
export async function main(){
 mkdirSync('out/brain/benchmarks',{recursive:true});
 const results=[];
 for(const scenario of scenarios){
  const outcome=await solveScenario(scenario);
  results.push(outcome);
  console.log('AI quality case',outcome.scenario,'=>',outcome.status,'attempts',outcome.attempts.length);
  for(const a of outcome.attempts)if(a.reason)console.log(' - attempt',a.attempt,':',a.reason.slice(0,130));
 }
 const metrics=score(results);
 const report={kind:'CONTROLLED_OFFLINE_AI_QUALITY_BENCHMARK',metrics,results,...manifestBase,created_at:new Date().toISOString()};
 writeFileSync('out/brain/benchmarks/report.json',JSON.stringify(report,null,2));
 const markdown=[
  '## Toyol AI Quality — Independent Behavioral Tests','',
  '- Controlled bug scenarios: **'+metrics.total+'**',
  '- Passed OFFLINE behavioral tests: **'+metrics.passed+'/'+metrics.total+'**',
  '- First-try passes: **'+metrics.firstTry+'**',
  '- Failed or unverified: **'+metrics.failed+'**',
  '- Actual bounty work accepted: **0** | Verified income: **RM0**',
  '',
  'Test files were not supplied to the model. Model-generated code was tested in a no-network, read-only, unprivileged Docker container.',
  'These are curated exercises, NOT real third-party bounty acceptances.',
  ''
 ];
 for(const item of results)markdown.push('- '+item.scenario+': **'+item.status+'** ('+item.attempts.length+' attempts)');
 const note=markdown.join('\n')+'\n';
 console.log(note);
 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,note);
 return report;
}
if(process.argv[1]?.endsWith('brain-benchmark.mjs'))main().catch(err=>{console.error(err.message);process.exitCode=1;});
