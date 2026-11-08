/**
 * Toyol skill pack B: finite, bounded file edits.
 * No AI API, wallet, network requests, command execution or external submissions.
 */
import {existsSync, readFileSync, writeFileSync, statSync} from 'node:fs';
import {resolve, relative, sep} from 'node:path';

export const extraSkillNames=Object.freeze([
  'markdown-link','markdown-heading','import-module','remove-console-log',
  'gitignore-entry','json-field','csv-column','literal-replace'
]);
const PATH='(README\\.md|\\.gitignore|(?:docs|src|lib|app|data|fixtures|datasets)/[\\w./-]{2,100})';
const NAME='[A-Za-z_$][\\w$-]{1,60}';
const MOD='[@\\w./-]{2,90}';
const URL='https:\\/\\/[^\\s<>\\x60\\x27"]{3,160}';
const safePath=p=>typeof p==='string'&&!p.includes('..')&&!p.includes('\\')&&!p.includes('//')&&!p.startsWith('/')&&!p.split('/').some(x=>x.startsWith('.'));
const docsPath=p=>/^(README\.md|docs\/[\w./-]+\.md)$/i.test(p);
const codePath=p=>/^(src|lib|app)\/[\w./-]+\.(tsx?|jsx?)$/i.test(p);
const dataPath=p=>/^(data|fixtures|datasets)\/[\w./-]+$/i.test(p);
const goodURL=x=>{try{const u=new URL(x);return u.protocol==='https:'&&!!u.hostname.includes('.')&&!u.username&&!u.password;}catch{return false;}};
const escapeReg=s=>[...s].map(ch=>'\\.^$*+?()[]{}|'.includes(ch)?'\\'+ch:ch).join('');

export function parseExtra(title) {
 const s=String(title||'').trim().replace(/^\[BOUNTY\]\s*/i,'');
 if(s.length>240)return null;
 let m;
 m=new RegExp('^(?:fix broken markdown link|replace markdown link|update markdown link)\\s+('+URL+')\\s+(?:to|with)\\s+('+URL+')\\s+in\\s+'+PATH+'$','i').exec(s);
 if(m&&safePath(m[3])&&docsPath(m[3])&&goodURL(m[1])&&goodURL(m[2])&&m[1]!==m[2])
   return {kind:'markdown-link',from:m[1],to:m[2],path:m[3]};
 m=new RegExp('^(?:rename markdown heading|replace markdown heading)\\s+["\\x60]([^"\\x60]{3,60})["\\x60]\\s+(?:to|with)\\s+["\\x60]([^"\\x60]{3,60})["\\x60]\\s+in\\s+'+PATH+'$','i').exec(s);
 if(m&&safePath(m[3])&&docsPath(m[3])&&m[1]!==m[2])
   return {kind:'markdown-heading',from:m[1],to:m[2],path:m[3]};
 m=new RegExp('^(?:replace import|rename import|change import)\\s+["\\x60\\x27]?('+MOD+')["\\x60\\x27]?\\s+(?:to|with)\\s+["\\x60\\x27]?('+MOD+')["\\x60\\x27]?\\s+in\\s+'+PATH+'$','i').exec(s);
 if(m&&safePath(m[3])&&codePath(m[3])&&m[1]!==m[2])
   return {kind:'import-module',from:m[1],to:m[2],path:m[3]};
 m=new RegExp('^remove\\s+console\\.log\\s+(?:statements?\\s+)?from\\s+'+PATH+'$','i').exec(s);
 if(m&&safePath(m[1])&&codePath(m[1]))return {kind:'remove-console-log',path:m[1]};
 m=/^(?:add|ignore)\s+["\x60\x27]?([\w*./-]{2,70})["\x60\x27]?\s+(?:to|in)\s+\.gitignore$/i.exec(s);
 if(m&&!m[1].includes('..')&&!m[1].startsWith('/')&&!/^(src|test|tests)\/?$/.test(m[1]))
   return {kind:'gitignore-entry',path:'.gitignore',pattern:m[1]};
 m=new RegExp('^set\\s+["\\x60\\x27]?('+NAME+')["\\x60\\x27]?\\s+to\\s+(true|false|-?\\d{1,7})\\s+in\\s+'+PATH+'$','i').exec(s);
 if(m&&safePath(m[3])&&dataPath(m[3])&&m[3].endsWith('.json'))
   return {kind:'json-field',key:m[1],value:m[2]==='true'?true:m[2]==='false'?false:Number(m[2]),path:m[3]};
 m=new RegExp('^rename\\s+csv\\s+column\\s+["\\x60\\x27]?('+NAME+')["\\x60\\x27]?\\s+to\\s+["\\x60\\x27]?('+NAME+')["\\x60\\x27]?\\s+in\\s+'+PATH+'$','i').exec(s);
 if(m&&safePath(m[3])&&dataPath(m[3])&&m[3].endsWith('.csv')&&m[1]!==m[2])
   return {kind:'csv-column',from:m[1],to:m[2],path:m[3]};
 m=new RegExp('^replace literal\\s+["\\x60]([^"\\x60]{2,70})["\\x60]\\s+with\\s+["\\x60]([^"\\x60]{2,70})["\\x60]\\s+in\\s+'+PATH+'$','i').exec(s);
 if(m&&safePath(m[3])&&(docsPath(m[3])||codePath(m[3])||dataPath(m[3]))&&m[1]!==m[2])
   return {kind:'literal-replace',from:m[1],to:m[2],path:m[3]};
 return null;
}
export function editContent(before,spec){
 if(before.includes('\u0000')||before.includes('\uFFFD'))throw Error('binary data');
 let count=0,content=before;
 const replace=(regex,fn)=>{content=content.replace(regex,(...args)=>{count++;return fn(...args);});};
 switch(spec.kind){
 case 'markdown-link':
   replace(new RegExp('(\\]\\()'+escapeReg(spec.from)+'(\\))','g'),(_m,a,b)=>a+spec.to+b);break;
 case 'markdown-heading':
   replace(new RegExp('^(#{1,6}\\s+)'+escapeReg(spec.from)+'(\\s*)$','gm'),(_m,a,b)=>a+spec.to+b);break;
 case 'import-module':
   replace(new RegExp('((?:\\bfrom\\s+|\\bimport\\s*\\(|\\brequire\\s*\\()\\s*["\\x27])'+escapeReg(spec.from)+'(["\\x27])','g'),(_m,a,b)=>a+spec.to+b);break;
 case 'remove-console-log':
   replace(/^[ \t]*console\.log\([^;\n]*\);?[ \t]*(?:\r?\n|$)/gm,()=> '');break;
 case 'gitignore-entry':
   if(!before.split(/\r?\n/).includes(spec.pattern)){content=before.replace(/\s*$/,'')+'\n'+spec.pattern+'\n';count=1;}break;
 case 'json-field':{
   let json;try{json=JSON.parse(before);}catch{throw Error('invalid JSON');}
   if(!json||Array.isArray(json)||typeof json!=='object'||!Object.hasOwn(json,spec.key)||typeof json[spec.key]==='object')throw Error('JSON key absent or complex');
   if(json[spec.key]!==spec.value){json[spec.key]=spec.value;content=JSON.stringify(json,null,2)+'\n';count=1;}break;
 }
 case 'csv-column':{
   const split=before.indexOf('\n');
   const header=(split<0?before:before.slice(0,split)).replace(/\r$/,'');
   if(header.includes('"'))throw Error('quoted CSV unsupported');
   const cols=header.split(',');
   if(cols.filter(x=>x===spec.from).length!==1||cols.includes(spec.to))throw Error('CSV header ambiguous');
   content=cols.map(x=>x===spec.from?spec.to:x).join(',')+(split<0?'':(before[split-1]==='\r'?'\r\n':'\n')+before.slice(split+1));count=1;break;
 }
 case 'literal-replace':{
   count=before.split(spec.from).length-1;
   if(count>0&&count<=10)content=before.split(spec.from).join(spec.to);break;
 }
 default:throw Error('unknown skill');
 }
 return {content,count};
}
export function applyExtra(root,spec){
 if(!spec||!extraSkillNames.includes(spec.kind)||!safePath(spec.path))throw Error('unsupported task/path');
 const base=resolve(root),file=resolve(base,spec.path);
 if(!file.startsWith(base+sep)||!existsSync(file)||!statSync(file).isFile()||statSync(file).size>90000)throw Error('missing, oversized or unsafe file');
 const before=readFileSync(file,'utf8'),result=editContent(before,spec);
 if(result.count<1||result.count>12||result.content.length>120000||result.content===before)throw Error('no bounded change');
 writeFileSync(file,result.content,'utf8');
 return {count:result.count,files:[relative(base,file)],skill:spec.kind};
}
