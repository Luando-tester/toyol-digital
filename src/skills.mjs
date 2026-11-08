/**
 * Toyol deterministic skills. Does not run downloaded programs or use paid AI.
 * Every supported instruction is a tightly bounded, testable text change.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const IDENT = '[A-Za-z_$][A-Za-z0-9_$]{2,59}';
const rename = new RegExp('^(?:\\[bounty\\]\\s*)?(?:rename|replace)\\s+[\x60\\x27"]?('+IDENT+')[\x60\\x27"]?\\s+(?:to|with)\\s+[\x60\\x27"]?('+IDENT+')[\x60\\x27"]?\\s*[.!]?$', 'i');
const jsx = new RegExp('^(?:\\[bounty\\]\\s*)?remove\\s+[\x60\\x27"]?('+IDENT+')[\x60\\x27"]?\\s+in\\s+favor\\s+of\\s+[\x60\\x27"]?('+IDENT+')=\\{(true|false)\\}[\x60\\x27"]?\\s*[.!]?$', 'i');
const docs = new RegExp('^(?:\\[bounty\\]\\s*)?(?:fix\\s+typo|replace\\s+text)\\s+[\x60\\x27"]?([A-Za-z][A-Za-z0-9_-]{2,50})[\x60\\x27"]?\\s+(?:to|with)\\s+[\x60\\x27"]?([A-Za-z][A-Za-z0-9_-]{2,50})[\x60\\x27"]?\\s+in\\s+(?:the\\s+)?(?:readme|documentation|docs)\\s*[.!]?$', 'i');

export function parseInstruction(title, summary = '') {
  const candidates = [String(title || '').trim(), ...String(summary || '').split(/\n|[.;]\s+/).slice(0, 4).map(x => x.trim())];
  for (const line of candidates) {
    if (line.length > 200 || !line) continue;
    let m = rename.exec(line);
    if (m && m[1] !== m[2]) return { kind:'rename-identifier', from:m[1], to:m[2] };
    m = jsx.exec(line);
    if (m && m[1] !== m[2]) return { kind:'jsx-boolean-prop', from:m[1], to:m[2], bool:m[3] };
    m = docs.exec(line);
    if (m && m[1] !== m[2]) return { kind:'docs-typo', from:m[1], to:m[2] };
  }
  return null;
}

const SEARCH_FOLDERS = new Set(['src','lib','app','packages','docs']);
const IGNORE = /(^|\/)(\.git|dist|build|vendor|node_modules|coverage|generated|out)(\/|$)|\.min\.(js|css)$/i;
function isEligible(path,kind) {
  if(kind==='docs-typo')return /(^readme\.md$|^docs\/.*\.md$)/i.test(path);
  if(kind==='jsx-boolean-prop')return /\.(tsx|jsx)$/i.test(path);
  return /\.(ts|tsx|js|jsx|py)$/i.test(path);
}
function walk(root, dir=root, depth=0, output=[]) {
  if(depth > 8 || output.length >= 300) return output;
  for (const file of readdirSync(dir, {withFileTypes:true})) {
    if(file.isSymbolicLink()) continue;
    const full=join(dir,file.name), path=relative(root,full).replaceAll('\\','/');
    if(IGNORE.test(path))continue;
    if(file.isDirectory()) {
      if(depth===0 && !SEARCH_FOLDERS.has(file.name)) continue;
      walk(root,full,depth+1,output);
    } else if(file.isFile() && statSync(full).size <= 100000) output.push({full,path});
    if(output.length>=300)break;
  }
  return output;
}
function wordRegex(word) {
  return new RegExp('(?<![A-Za-z0-9_$])'+word.replace(/[$]/g,'\\$')+'(?![A-Za-z0-9_$])','g');
}
export function change(text, spec) {
  let count=0, output=text;
  if(spec.kind==='rename-identifier'||spec.kind==='docs-typo') {
    output=text.replace(wordRegex(spec.from),()=>{count++;return spec.to;});
  } else if(spec.kind==='jsx-boolean-prop') {
    // Only JSX tags with a standalone old boolean prop; no valued props.
    const r = new RegExp('(<[A-Za-z][A-Za-z0-9_.-]*(?:[^>]{0,1500}?)\\s)'+spec.from+'(?=\\s|\\/?>)','g');
    output=text.replace(r,(_m,pre)=>{count++;return pre+spec.to+'={'+spec.bool+'}';});
  }
  return { content:output, count };
}
export function applyInstruction(root,spec) {
  if(!spec||!['rename-identifier','docs-typo','jsx-boolean-prop'].includes(spec.kind))throw Error('unsupported instruction');
  const changes=[];
  for(const {full,path} of walk(root)) {
    if(!isEligible(path,spec.kind))continue;
    const original=readFileSync(full,'utf8');
    if(original.includes('\u0000')||original.includes('\uFFFD'))continue;
    const revised=change(original,spec);
    if(revised.count) changes.push({full,path,revised});
    if(changes.length>4)throw Error('too many files for an unattended fix');
  }
  const count=changes.reduce((n,c)=>n+c.revised.count,0);
  if(count<1||count>15)throw Error('no small deterministic fix found');
  changes.forEach(c=>writeFileSync(c.full,c.revised.content,'utf8'));
  return {count, files:changes.map(c=>c.path), skill:spec.kind};
}
