/**
 * Evidence-based code retrieval. Fail closed when issue description has
 * no plausible relationship to any safely readable source file.
 */
import {basename} from 'node:path';
import {readableFile,safeFile} from './brain-core.mjs';

const generic=new Set([
 'this','that','with','from','into','have','should','could','would','there',
 'support','change','update','issue','fix','bug','feature','code','task',
 'files','file','test','tests','after','when','then','return','make',
 'need','using','their','your','work','please','error','wrong','adding',
 'add','remove','new','existing','function','functions','request','expected',
 'actual','more','that','does','doesn','project','logic','case'
]);
function words(s){
 return [...new Set(String(s||'').replace(/([a-z])([A-Z])/g,'$1 $2')
  .toLowerCase().match(/[a-z][a-z0-9]{2,}/g)?.filter(w=>w.length>=4&&!generic.has(w))||[])];
}
export function rankEvidence(paths,title,body=''){
 const t=String(title||'').slice(0,250);
 const b=String(body||'').slice(0,2000);
 const issue=(t+'\n'+b).toLowerCase();
 const tokens=new Set(words(t+' '+b));
 const occurrences=(b.match(/(?:README\.md|(?:src|lib|app|docs|test|tests|data|fixtures|datasets)\/[\w./-]+\.(?:js|mjs|cjs|ts|tsx|jsx|py|json|md|csv))/gi)||[])
   .filter(readableFile).map(x=>x.toLowerCase());
 return paths.filter(readableFile).filter(p=>!/(^|\/)(?:dist|vendor|node_modules|generated|build)(\/|$)/i.test(p))
  .map(path=>{
   const low=path.toLowerCase();
   const name=basename(path);
   const stem=name.replace(/\.(test|spec)\..+$/,'').replace(/\.[^.]+$/,'');
   let score=0;
   if(occurrences.includes(low))score+=120;
   if(issue.includes(low))score+=65;
   for(const w of words(stem)){
    if(tokens.has(w))score+=17;
   }
   for(const w of words(path.replaceAll('/',' '))){
    if(tokens.has(w))score+=4;
   }
   if((/readme|documentation|docs/i.test(issue))&&/^(?:README\.md|docs\/)/i.test(path))score+=7;
   if(/^(test|tests)\//.test(path)&&score>0)score+=2;
   return {path,score,editable:safeFile(path)};
  })
  .filter(x=>x.score>0)
  .sort((a,b)=>b.score-a.score||a.path.localeCompare(b.path));
}
export function chooseEvidence(paths,title,body='',maxFiles=5){
 const ranked=rankEvidence(paths,title,body);
 const editable=ranked.filter(x=>x.editable);
 if(!editable.length)return {paths:[],reason:'NO_RELEVANT_EDITABLE_SOURCE',ranked:ranked.slice(0,10)};
 const chosen=editable.slice(0,Math.min(maxFiles,3)).map(x=>x.path);
 const tests=ranked.filter(x=>!x.editable&&/^(?:test|tests)\//.test(x.path))
  .filter(x=>x.score>=14)
  .slice(0,Math.max(0,maxFiles-chosen.length)).map(x=>x.path);
 // Read-only tests are helpful to the model but cannot become patch targets.
 return {paths:[...chosen,...tests],reason:null,ranked:ranked.slice(0,10)};
}
