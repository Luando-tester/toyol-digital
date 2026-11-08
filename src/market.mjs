/**
 * Evidence-driven opportunity audit. It measures fit, not earnings or payout.
 * Public feed is supplied by stage-1; never makes additional network requests.
 */
import { readFileSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { parseGig } from './toyol.mjs';
import { plan } from './worker.mjs';

const candidates = /\b(fix|correct|repair|rename|replace|remove|readme|typo|documentation|docs|update|refactor)\b/i;
const sourceAllow = new Set(['algora','issuehunt','bountyhub','opire']);
const githubIssue = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/[1-9]\d*(?:[?#].*)?$/;
const safe = value => String(value??'').replace(/[\x00-\x1f\x7f]/g,' ').slice(0,145);
const countBy = (arr, fn) => arr.reduce((a,x) => {const k=fn(x);a[k]=(a[k]||0)+1;return a;}, {});

export function audit(items, now=Date.now()) {
 const data = Array.isArray(items)?items:[];
 const valid = data.map(g => parseGig(g,now)).filter(Boolean);
 const fixKeyword = valid.filter(g=>candidates.test(g.title+' '+g.summary));
 const direct = valid.filter(g=>sourceAllow.has(g.source)&&githubIssue.test(g.url));
 const matched = direct.map(g=>({gig:g,task:plan(g)})).filter(x=>x.task);
 const bySource=countBy(valid,g=>g.source);
 const compact = matched.slice(0,12).map(({gig,task})=>({
   title:safe(gig.title),url:gig.url,advertised_reward:gig.amount+' '+gig.currency,kind:task.skill.kind
 }));
 return {
   generatedAt:new Date(now).toISOString(),
   total_feed_items:data.length,
   passed_initial_safety_filters:valid.length,
   coding_or_docs_keywords:fixKeyword.length,
   github_bounty_source_links:direct.length,
   matching_automated_skills:matched.length,
   sampled_matched_tasks:compact,
   passed_by_source:bySource,
   patch_produced:0,
   work_accepted:0,
   earned_amount_verified:0,
   caveat:'Candidates in this audit are only advertised listings, not verified open or unclaimed issues, completed jobs, or income.'
 };
}
export function report(a) {
 const rows=[
   '## Toyol Market Fit Audit',
   '',
   '- Indexed feed items: **'+a.total_feed_items+'**',
   '- Survived basic safety filters: **'+a.passed_initial_safety_filters+'**',
   '- Describe coding/docs repair: **'+a.coding_or_docs_keywords+'**',
   '- GitHub issue links from supported boards: **'+a.github_bounty_source_links+'**',
   '- Match an implemented automated skill: **'+a.matching_automated_skills+'**',
   '- Accepted work: **0** | Verified income: **RM0**',
   '',
   'These are screening statistics, **not** successfully earned rewards.',
   ''
 ];
 if(a.sampled_matched_tasks.length){
   rows.push('Possible matching listings (subject to issue claim/competition checks):','');
   for(const c of a.sampled_matched_tasks)
     rows.push('- '+c.url+' — '+c.kind+' — advertised '+c.advertised_reward);
 } else rows.push('**No tasks in this feed match Toyol skills.** Increasing polling frequency will not solve the skill gap.');
 rows.push('');
 return rows.join('\n');
}
export function main() {
 const payload=JSON.parse(readFileSync('out/feed.json','utf8'));
 const result=audit(payload.items);
 mkdirSync('out/market',{recursive:true});
 writeFileSync('out/market/fit.json',JSON.stringify(result,null,2),'utf8');
 const summary=report(result);
 console.log(summary);
 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary+'\n');
 return result;
}
if(process.argv[1]?.endsWith('market.mjs'))main();
