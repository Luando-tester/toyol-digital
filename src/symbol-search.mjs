/**
 * Safe symbol-grounded source retrieval from a Git checkout.
 * Search identifier tokens from issue text, never execute repository code.
 * Git arguments are passed as arrays, never through a command shell.
 */
import {execFileSync} from 'node:child_process';
import {readableFile,safeFile} from './brain-core.mjs';
const STOP=new Set(['remove','replace','rename','change','support','issue','update','function','error','false','true','parser','tests','test','value','return','document','please','should','fixing','feature','existing','instead','readme','markdown','boolean']);
const ident=/\b[A-Za-z_$][A-Za-z0-9_$]{4,59}\b/g;
export function issueSymbols(title,body=''){
 const raw=String(title||'').slice(0,220)+' '+String(body||'').slice(0,600);
 const out=[];
 for(const match of raw.matchAll(ident)){
  const w=match[0];
  if(STOP.has(w.toLowerCase()))continue;
  const technical=/[a-z][A-Z]|^[A-Z][a-z]+[A-Z]|[A-Z]{2,}[a-z]|\d|_|\$/.test(w);
  const surrounded=raw.slice(Math.max(0,match.index-1),match.index)==='[';
  if(technical||surrounded)out.push(w);
 }
 return [...new Set(out)].slice(0,6);
}
export function findSourceBySymbols(root,title,body='',{git=execFileSync}={}){
 const symbols=issueSymbols(title,body);
 if(!symbols.length)return {symbols:[],paths:[],status:'NO_IDENTIFIERS'};
 const hits=[];
 for(const word of symbols.slice(0,4)){
  try{
   const result=git('git',['grep','-l','-F','-e',word,'--',
    '*.ts','*.tsx','*.js','*.jsx','*.mjs','*.cjs','*.py'],{
    cwd:root,encoding:'utf8',timeout:8000,maxBuffer:180000,
    env:{...process.env,GITHUB_TOKEN:'',GH_TOKEN:'',GIT_TERMINAL_PROMPT:'0'}
   });
   for(const path of result.split(/\r?\n/).filter(Boolean)){
    if(readableFile(path)&&safeFile(path))hits.push({path,symbol:word});
   }
  }catch(e){if(e.status!==1)continue;}
 }
 const distinct=[...new Set(hits.map(x=>x.path))].slice(0,10);
 return {symbols,paths:distinct,status:distinct.length?'MATCHED_SOURCE':'NOT_FOUND',
  matching_symbols:[...new Set(hits.map(x=>x.symbol))]};
}
