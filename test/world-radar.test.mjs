import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeHimalayas,normalizeRemotive,normalizeLever,selectLeads,scanSources,makeReport} from '../src/world-radar.mjs';
test('Malaysia contractor listing is visible but payment never assumed',()=>{
 const raw={title:'Malay content writer',companyName:'Example Co',applicationLink:'https://himalayas.app/jobs/example',
  guid:'https://himalayas.app/companies/example/jobs/writer',employmentType:'Contractor',
  locationRestrictions:['Malaysia'],minSalary:1000,currency:'MYR',salaryPeriod:'monthly'};
 const x=selectLeads([normalizeHimalayas(raw)]);
 assert.equal(x.length,1);assert.equal(x[0].Malaysia_eligibility,'REGION_SIGNAL_ONLY_NEEDS_EMPLOYER_CONFIRMATION');
 assert.equal(x[0].payout_myr_verified,false);
 assert.equal(x[0].advertised_pay_myr_estimate,1000);
});
test('location-restricted and deposit solicitations are discarded',()=>{
 const a=normalizeRemotive({title:'Academic Writer',url:'https://remotive.com/job/1',job_type:'contract',
  candidate_required_location:'US only'});
 const b=normalizeRemotive({title:'Data editor - pay deposit to start',url:'https://remotive.com/job/2',job_type:'contract',
  candidate_required_location:'Worldwide'});
 assert.deepEqual(selectLeads([a,b]),[]);
});
test('full-time roles do not masquerade as autonomous microtask or earned revenue',()=>{
 const x=selectLeads([normalizeRemotive({title:'Content editor',url:'https://remotive.com/job/3',
  company_name:'Acme',job_type:'full_time',candidate_required_location:'Worldwide'})])[0];
 assert.equal(x.task_type,'JOB_APPLICATION');
 assert.equal(x.payout_myr_verified,false);assert.ok(x.score<60);
});
test('world radar tolerates one API failing and preserves source failure evidence',async()=>{
 let count=0;
 const x=await scanSources(async url=>{
  count++;
  if(url.includes('remotive.com'))throw Error('HTTP 429');
  return {jobs:[{title:'Malay Translator',guid:'https://himalayas.app/companies/x/jobs/y',
   applicationLink:'https://himalayas.app/companies/x/jobs/y',
   companyName:'Acme',employmentType:'Contractor',locationRestrictions:['Malaysia']}]};
 });
 assert.equal(count,9);
 assert.equal(x.sources.filter(s=>s.status==='ERROR').length,5);
 assert.ok(x.leads.length>0);
 assert.equal(x.verified_received_myr,0);
});
test('reports credit both providers with no fictional payment',()=>{
 const s=makeReport({sources:[],leads:[]});
 assert.match(s,/Himalayas/);assert.match(s,/Remotive/);assert.match(s,/RM0/);
});

test('Chinese translation does not outrank Malay competency',()=>{
 const x=selectLeads([
  normalizeHimalayas({title:'Freelance Traditional Chinese to English Translator',
    guid:'https://himalayas.app/companies/x/jobs/chinese',
    applicationLink:'https://himalayas.app/companies/x/jobs/chinese',
    employmentType:'Contractor',locationRestrictions:['Malaysia']}),
  normalizeLever({id:'job-1',text:'AI Data Specialist - Malay',
    hostedUrl:'https://jobs.lever.co/rws/job-1',
    categories:{location:'Johor Bahru',commitment:'Temporary/Contract'},
    descriptionPlain:'Review Malay AI answers'})
 ]);
 assert.equal(x.length,1);
 assert.equal(x[0].source,'RWS via Lever');
 assert.equal(x[0].region,'MALAYSIA_INCLUDED');
});

test('clinical doctorate and Singapore-only job titles never masquerade as MY skill fit',()=>{
 const base={guid:'https://himalayas.app/companies/x/jobs/test',
  applicationLink:'https://himalayas.app/companies/x/jobs/test',
  employmentType:'Contractor',locationRestrictions:['Malaysia']};
 const medical=normalizeHimalayas({...base,title:'Malay Psychiatrist - Remote'});
 const doctorate=normalizeHimalayas({...base,title:'Malay Psychologist PhD'});
 const sg=normalizeLever({id:'sg',text:'Linguistic AI Auditor - Malay (Singapore)',hostedUrl:'https://jobs.lever.co/rws/sg',
  categories:{location:'Singapore',commitment:'Contract'}});
 assert.equal(selectLeads([medical,doctorate,sg]).length,0);
});
