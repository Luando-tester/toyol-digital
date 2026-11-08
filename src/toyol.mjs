/**
 * Toyol Digital v0.1 — read-only zero-cash public bounty radar.
 * No claim, submission, purchase, wallet, or earned-income assertions.
 */
import { appendFileSync } from 'node:fs';

export const FEED_URL = 'https://jobbi.org/gigs.json?lane=agent&limit=1000';
const REPO = 'ilhamraduanbis-source/toyol-digital';
const ISSUE_TITLE = '🧟 Toyol Radar — calon ganjaran untuk disahkan';
const gradeScore = { 'A+': 25, A: 24, 'A-': 22, 'B+': 16, B: 14, 'B-': 12, 'C+': 5, C: 3 };
const disallowed = /\b(deposit|staking|stake|bond|collateral|fund (?:a|the|another|new) task|pay (?:a|the) fee|purchase|buy (?:a|an|the) (?:token|product)|subscribe|referral|invite friends|post on (?:reddit|x|twitter|threads)|social media campaign)\b/i;

function clean(value, max = 250) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
function escapeMd(value) {
  return clean(value).replace(/([\\\[\]<>|*_])/g, '\\$1');
}
function safeUrl(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : '';
  } catch { return ''; }
}

export function parseGig(item, now = Date.now()) {
  const m = item?._jobbi || {};
  const reward = m.reward || {};
  const amount = Number(reward.amount);
  const currency = clean(reward.currency, 16).toUpperCase();
  const title = clean(item?.title, 140);
  const summary = clean(item?.content_text || item?.summary, 500);
  const url = safeUrl(item?.url);
  const id = clean(item?.id || url, 150);
  const state = clean(m.payment_state, 40).toLowerCase();
  const acceptance = clean(m.acceptance_type || m.acceptance, 120);
  const source = clean(m.source || 'unknown', 40);
  const grade = clean(m.payout_grade, 12);
  if (!id || !title || !url || clean(m.lane).toLowerCase() !== 'agent') return null;
  if (!Number.isFinite(amount) || amount <= 0 || !['USD','USDC'].includes(currency)) return null;
  if (disallowed.test(title + ' ' + summary) || m.claims_open === false) return null;
  if (m.expires && (!Number.isFinite(Date.parse(m.expires)) || Date.parse(m.expires) < now)) return null;
  let score = gradeScore[grade] ?? 0;
  if (state === 'escrowed') score += 35;
  else if (state === 'funded') score += 30;
  else if (state === 'promised') score -= 10;
  if (amount <= 25) score += 12;
  else if (amount <= 100) score += 6;
  if (/machine|automatic|on.chain/i.test(acceptance)) score += 7;
  if (/human|manual|review/i.test(acceptance)) score -= 8;
  return { id, title, summary, url, amount, currency, source, state, acceptance, grade, score };
}

export function shortlist(items, limit = 8, now = Date.now()) {
  const seen = new Set();
  return (items || []).map(item => parseGig(item, now)).filter(Boolean)
    .sort((a,b) => b.score - a.score || a.amount - b.amount)
    .filter(g => { if (seen.has(g.id)) return false; seen.add(g.id); return true; })
    .slice(0, limit);
}

export function formatReport(gigs, generatedAt = '') {
  const out = [
    '# 🧟 Toyol Radar', '',
    '**Status: CALON TUGASAN, BUKAN PENDAPATAN.**', '',
    'Sumber: [Jobbi](https://jobbi.org/gigs), indeks awam yang bukan pembayar.',
    'Tiada deposit, staking, yuran, iklan atau posting media sosial dibenarkan.',
    'Penapis teks tidak boleh mengesahkan semua kos tersembunyi, payout Malaysia atau escrow.',
    'Toyol tidak menuntut tugasan, menyerahkan hasil, atau menerima bayaran.', ''
  ];
  if (generatedAt) out.push('Disemak (UTC): ' + generatedAt, '');
  if (!gigs.length) out.push('Tiada calon lulus saringan awal.', '');
  for (const [i,g] of gigs.entries()) {
    out.push(
      '### ' + (i+1) + '. ' + escapeMd(g.title),
      '- Sumber asal: ' + g.url,
      '- Ganjaran diiklankan: ' + g.amount + ' ' + g.currency,
      '- Board: ' + escapeMd(g.source) + ' | gred indeks: ' + escapeMd(g.grade || 'tiada') + ' | status dana: ' + escapeMd(g.state || 'tidak dinyatakan'),
      '- Penerimaan: ' + escapeMd(g.acceptance || 'tidak dinyatakan'),
      '- Ringkasan: ' + escapeMd(g.summary.slice(0,180)), ''
    );
  }
  out.push('**Penting:** semak terma sumber asal, status ganjaran, kebenaran automasi, kos dan pengeluaran di Malaysia sebelum bertindak.', '');
  return out.join('\n');
}

async function gh(path, method, token, payload) {
  const response = await fetch('https://api.github.com' + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(payload ? { 'Content-Type': 'application/json' } : {})
    },
    ...(payload ? { body: JSON.stringify(payload) } : {})
  });
  if (!response.ok) throw new Error('GitHub API HTTP ' + response.status);
  return response.json();
}

async function publishAlert(gigs) {
  const token = process.env.GITHUB_TOKEN;
  if (!token || process.env.GITHUB_REPOSITORY !== REPO || !gigs.length) return;
  const path = '/repos/' + REPO + '/issues';
  const open = await gh(path + '?state=open&per_page=100', 'GET', token);
  const previous = open.find(issue => !issue.pull_request && issue.title === ISSUE_TITLE);
  const body = '<!-- toyol-radar-v1 -->\n' + formatReport(gigs);
  if (!previous) await gh(path, 'POST', token, { title: ISSUE_TITLE, body });
  else if (previous.body !== body) await gh(path + '/' + previous.number, 'PATCH', token, { body });
}

export async function main() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(FEED_URL, {
      signal: controller.signal,
      headers: {
        Accept: 'application/feed+json, application/json',
        'User-Agent': 'ToyolRadar/0.1 (hourly public feed check)'
      }
    });
    if (!res.ok) throw new Error('Jobbi HTTP ' + res.status);
    const feed = await res.json();
    if (!Array.isArray(feed.items)) throw new Error('Feed items array missing');
    const gigs = shortlist(feed.items);
    const report = formatReport(gigs, new Date().toISOString());
    console.log(report);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + '\n', 'utf8');
    try { await publishAlert(gigs); }
    catch (error) { console.error('Issue alert failed: ' + error.message); }
    return gigs;
  } finally { clearTimeout(timer); }
}
if (process.argv[1]?.endsWith('toyol.mjs')) main().catch(error => {
  console.error('Toyol scan failed: ' + error.message);
  process.exitCode = 1;
});
