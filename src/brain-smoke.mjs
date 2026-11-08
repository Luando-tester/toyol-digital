/**
 * Real offline local-model smoke test, not a paid job.
 * The entire task and original file come from this repo's controlled fixture.
 */
import {mkdirSync,writeFileSync,appendFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {collectContext,makeMessages,queryLocalModel,applyProposal} from './brain-core.mjs';
import {collectPatch} from './worker.mjs';

const root=process.cwd();
const source='fixtures/brain-demo.js';
const task='In the existing file fixtures/brain-demo.js, the function named add wrongly subtracts its two inputs. Correct the arithmetic so add returns their sum. Make the smallest edit; do not change the function signature.';
async function main(){
 mkdirSync('out/brain',{recursive:true});
 const input=collectContext(root,[source]);
 const messages=makeMessages(task,input);
 let manifest={status:'AI_SMOKE_NOT_YET_VERIFIED',model:'Qwen2.5-Coder-1.5B-Instruct-Q4_K_M',source,task,earned_amount_verified:0,external_bounty_completed:false};
 try{
  const proposal=await queryLocalModel(messages);
  manifest.proposed_edits=proposal.edits?.length||0;
  const {files,validation}=applyProposal(root,input,proposal);
  const patch=collectPatch(root);
  if(!patch.includes('diff --git a/fixtures/brain-demo.js b/fixtures/brain-demo.js')||!patch.includes('+  return a + b;'))throw Error('arithmetic correction was not demonstrated');
  const hash=createHash('sha256').update(patch).digest('hex');
  writeFileSync('out/brain/brain-patch.diff',patch+'\n');
  manifest={...manifest,status:'AI_GENERATED_PATCH_VALIDATED_ON_SYNTHETIC_FIXTURE',files,validation,patch_sha256:hash};
  console.log('AI generated a concrete, syntax-checked arithmetic fix. This is NOT a completed bounty or income.');
  if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## Toyol Local AI Brain\n\nAI generated a valid patch for an intentionally broken example, checked with Node.js syntax parsing.\n\n**No real bounty, acceptance or payment.**\n\n');
 }catch(e){
  manifest={...manifest,status:'AI_SMOKE_FAILED',failure:String(e.message).slice(0,250)};
  console.error('AI smoke failed:',manifest.failure);
  process.exitCode=1;
 }finally{
  writeFileSync('out/brain/manifest.json',JSON.stringify(manifest,null,2));
 }
}
main().catch(e=>{console.error(String(e.message));process.exitCode=1;});
