import test from 'node:test';
import assert from 'node:assert/strict';
import {locateGitHubIssue,evaluateOriginalIssue,validateOriginalIssues} from '../src/original-issue-gate.mjs';

const task={url:'https://github.com/sample/project/issues/10',title:'Fix bounded bug',source:'Jobbi / algora',
 reward_amount:5,review_score:90,suitable_for_draft:true,next_action:'VERIFY'};
test('only canonical GitHub issue URLs are fetched',()=>{
 assert.deepEqual(locateGitHubIssue(task.url),{owner:'sample',repo:'project',issue:10});
 assert.equal(locateGitHubIssue('https://github.com.evil.net/owner/repo/issues/1'),null);
 assert.equal(locateGitHubIssue('https://github.com/owner/repo/pull/1'),null);
 assert.equal(locateGitHubIssue('http://github.com/owner/repo/issues/1'),null);
});
test('a closed original issue cannot be offered as startable work',()=>{
 const result=evaluateOriginalIssue(task,{state:'closed',comments:0});
 assert.equal(result.suitable_for_draft,false);
 assert.equal(result.next_action,'REJECT_SOURCE_CLOSED');
});
test('assigned and discussed issues are flagged but not rejected solely for competition',()=>{
 const result=evaluateOriginalIssue(task,{state:'open',assignee:{login:'other'},comments:43});
 assert.equal(result.suitable_for_draft,true);
 assert.equal(result.original_issue.status,'OPEN_AT_SOURCE');
 assert.deepEqual(result.original_issue.warnings,['MANY_EXISTING_DISCUSSIONS','ALREADY_ASSIGNED']);
 assert.equal(result.review_score,62);
});
test('original-source verification filters closed issues while retaining unverified evidence',async()=>{
 const items=[task,{...task,url:'https://github.com/example/repo/issues/2'},{...task,url:'https://example.org/gig'}];
 const result=await validateOriginalIssues(items,{fetchIssue:async ({issue})=>{
  if(issue===10)return {state:'closed'};
  throw Error('rate limited');
 }});
 assert.equal(result.rejected.length,1);
 assert.equal(result.active.length,2);
 assert.equal(result.active[0].original_issue.status,'UNVERIFIED');
 assert.equal(result.checked_github,2);
});
