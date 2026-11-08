/**
 * Static validation of an untrusted public repository patch.
 * Never executes downloaded repo scripts, tests, build commands, npm install,
 * or any code referenced by a GitHub issue. Uses syntax parsing only.
 */
import {readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,sep,extname} from 'node:path';
import {execFileSync} from 'node:child_process';

export function staticValidate(root,files){
 const base=resolve(root),checks=[];
 for(const rel of files){
  if(typeof rel!=='string'||rel.includes('..')||rel.startsWith('/')||rel.includes('\\'))throw Error('unsafe file path');
  const path=resolve(base,rel);
  if(!path.startsWith(base+sep)||!existsSync(path)||!statSync(path).isFile()||statSync(path).size>120000)throw Error('unsafe file');
  const ext=extname(path).toLowerCase();
  if(['.js','.mjs','.cjs'].includes(ext)){
   try{execFileSync(process.execPath,['--check','--input-type=module'],{input:readFileSync(path,'utf8'),timeout:8000,encoding:'utf8',stdio:'pipe'});}
   catch{throw Error('JavaScript syntax check failed');}
   checks.push({file:rel,validator:'node --check --input-type=module (stdin)',result:'pass'});
  }else if(ext==='.py'){
   // AST parsing only; the Python source itself is never executed.
   try{execFileSync('python3',['-c','import ast,sys;ast.parse(open(sys.argv[1],encoding="utf-8").read())',path],{timeout:8000,encoding:'utf8',stdio:'pipe'});}
   catch{throw Error('Python AST check failed');}
   checks.push({file:rel,validator:'python ast.parse',result:'pass'});
  }else if(ext==='.json'){
   try{JSON.parse(readFileSync(path,'utf8'));}
   catch{throw Error('JSON parse failed');}
   checks.push({file:rel,validator:'JSON.parse',result:'pass'});
  }else{
   checks.push({file:rel,validator:'git diff --check only; project tests not run',result:'limited'});
  }
 }
 return checks;
}
