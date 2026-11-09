/**
 * Toyol v0.4: honest, persistent quest-status display.
 * Never posts to third-party issues, never submits patches or implies earnings.
 */
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { extraSkillNames } from './skills-plus.mjs';

const REPO = 'ilhamraduanbis-source/toyol-digital';
const MARKER = '<!-- toyol-stage2-status -->';
const safe = (value, cap=160) => String(value ?? '').replace(/[\x00-\x1f\x7f]/g,' ').replace(/([\\*_\x60<>\[\]|])/g,'\\$1').slice(0,cap);

export function formatStatus(report, opts={}) {
  const runId = String(opts.runId || '');
  const event = opts.event === 'schedule' ? 'schedule (cron)' :
    opts.event === 'workflow_dispatch' ? 'manual' : opts.event === 'push' ? 'push (perubahan kod)' : 'unknown';
  const link = /^\d+$/.test(runId) ? 'https://github.com/'+REPO+'/actions/runs/'+runId : '';
  const failures = Array.isArray(report.failures) ? report.failures : [];
  const checked = Number.isInteger(report.checked) && report.checked >= 0 ? report.checked : 0;
  const found = report.found === true;
  const a = opts.audit && typeof opts.audit === 'object' ? opts.audit : null;
  const lines = [
    MARKER,
    '',
    '---',
    '## ⚔️ Quest Progress — Stage 2',
    '',
    '- Imbasan: '+safe(opts.time || 'tidak diketahui'),
    '- Pencetus: **'+event+'**',
    '- Kemahiran pembetulan khusus dipasang: **'+(3+extraSkillNames.length)+'**',
    '- Quest arahan khusus yang diperiksa: **'+checked+'**',
    '- Patch luar dihasilkan: **'+(found?'1':'0')+'**',
    '- Patch diserahkan: **0** | Kerja diterima: **0** | Pendapatan disahkan: **RM0**',
    '- Status: **'+(found ? 'PATCH DALAMAN UNTUK SEMAKAN' : 'BELUM ADA PENYELESAIAN SEBENAR')+'**'
  ];
  if(a){
    const indexed = Number.isInteger(a.total_feed_items)?a.total_feed_items:0;
    const safeCount = Number.isInteger(a.passed_initial_safety_filters)?a.passed_initial_safety_filters:0;
    const matches = Number.isInteger(a.matching_automated_skills)?a.matching_automated_skills:0;
    lines.push('','### Audit padanan peluang','',
      '- Tugasan diindeks: **'+indexed+'**',
      '- Lulus saringan: **'+safeCount+'**',
      '- Serasi dengan kemahiran Toyol: **'+matches+'**');
    if(matches <= 1)lines.push('- **Jurang besar:** kemahiran Toyol hampir tiada padanan; pencarian lebih kerap bukan penyelesaiannya.');
  }
  const intel = opts.intel && typeof opts.intel === 'object' ? opts.intel : null;
  if(intel)lines.push('','### Semakan sumber asal','',
    '- Isu diperiksa: **'+(intel.sources_checked||0)+'**',
    '- Calon boleh dicuba secara terhad: **'+(intel.conditional_candidates||0)+'**',
    '- Calon dengan persaingan (bukan automatik gugur): **'+(intel.competitive_candidates||0)+'**',
    '- Perlu semakan syarat dahulu: **'+(intel.needs_verification||0)+'**',
    '- Disekat oleh syarat keselamatan/kelayakan: **'+(intel.rejected||0)+'**',
    '- Tidak dapat disahkan: **'+(intel.unverified||0)+'**');
  if(link) lines.push('- Bukti pelaksanaan: '+link);
  if(found && typeof report.issue==='string' && /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/\d+$/.test(report.issue)) {
    lines.push('- Tugasan sumber: '+report.issue);
  }
  if(failures.length) {
    lines.push('','**Sebab tugasan ditolak:**');
    for(const f of failures.slice(0,6)) lines.push('- '+safe(f.reason,110));
  }
  if(!found) lines.push('', 'Tiada patch luar disahkan. Persaingan tidak lagi menjadi alasan automatik untuk menolak peluang; kesahihan pembayaran dan bukti ujian tetap diperlukan.');
  lines.push('', 'Ganjaran yang disenaraikan dalam radar **bukan** wang diperoleh.');
  return lines.join('\n')+'\n';
}

export function mergeStatus(body,status){
  const base = String(body || '').split(MARKER)[0].trimEnd();
  return base+'\n\n'+status;
}
async function main(){
  const report = JSON.parse(readFileSync('out/stage2/scan-result.json','utf8'));
  const audit = JSON.parse(readFileSync('out/market/fit.json','utf8'));
  const intel = existsSync('out/intelligence/quest-check.json') ? JSON.parse(readFileSync('out/intelligence/quest-check.json','utf8')) : null;
  const reportText = formatStatus(report,{
    event:process.env.GITHUB_EVENT_NAME,
    runId:process.env.GITHUB_RUN_ID,
    time:new Date().toISOString(),
    audit,
    intel
  });
  console.log(reportText);
  if(process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,reportText+'\n','utf8');
  const token=process.env.GITHUB_TOKEN;
  if(!token || process.env.GITHUB_REPOSITORY!==REPO) return;
  const endpoint='https://api.github.com/repos/'+REPO+'/issues/1';
  const headers={
    Authorization:'Bearer '+token,
    Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28'
  };
  const current=await fetch(endpoint,{headers});
  if(!current.ok) throw Error('Cannot read quest board: HTTP '+current.status);
  const issue=await current.json();
  if(issue.title!=='🧟 Toyol Radar — calon ganjaran untuk disahkan') throw Error('Issue #1 is not the Toyol quest board');
  const newBody=mergeStatus(issue.body,reportText);
  const updated=await fetch(endpoint,{
    method:'PATCH',
    headers:{...headers,'Content-Type':'application/json'},
    body:JSON.stringify({body:newBody})
  });
  if(!updated.ok) throw Error('Cannot update quest board: HTTP '+updated.status);
}
if(process.argv[1]?.endsWith('status.mjs'))main().catch(error=>{console.error(error.message);process.exitCode=1;});
