import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGig, shortlist, formatReport } from '../src/toyol.mjs';

const fixture = (props = {}) => ({
  id: 'basedagents:123',
  title: 'Fix a JSON parser',
  url: 'https://example.com/task/123',
  content_text: 'Write code and submit tests',
  _jobbi: {
    lane: 'agent',
    reward: { amount: 5, currency: 'USDC' },
    payment_state: 'escrowed',
    payout_grade: 'B-',
    acceptance_type: 'machine',
    claims_open: true,
    source: 'basedagents'
  },
  ...props
});

test('funded agent gig is considered', () => {
  const gig = parseGig(fixture());
  assert.equal(gig.amount, 5);
  assert.equal(gig.currency, 'USDC');
  assert.ok(gig.score > 40);
});
test('human gigs and unsafe links excluded', () => {
  assert.equal(parseGig(fixture({ _jobbi: { lane: 'human', reward: { amount: 5, currency: 'USD' } } })), null);
  assert.equal(parseGig(fixture({ url: 'javascript:alert(1)' })), null);
});
test('deposit and social-post offers excluded', () => {
  assert.equal(parseGig(fixture({ title: 'Deposit USDC to qualify' })), null);
  assert.equal(parseGig(fixture({ title: 'Post on Reddit to earn money' })), null);
  assert.equal(parseGig(fixture({ content_text: 'Create and fully fund a child bounty' })), null);
  assert.equal(parseGig(fixture({ title: 'Capture a macOS Safari evidence bundle' })), null);
});
test('expired gigs excluded', () => {
  assert.equal(parseGig(fixture({ _jobbi: { ...fixture()._jobbi, expires: '2020-01-01' } })), null);
});
test('duplicate IDs removed, report clearly says no earnings', () => {
  const gigs = shortlist([fixture(), fixture(), fixture({ id: 'other:23', title: 'Another task' })]);
  assert.equal(gigs.length, 2);
  const report = formatReport(gigs);
  assert.match(report, /BUKAN PENDAPATAN/);
  assert.match(report, /tidak menuntut tugasan/);
});

test('rejects tiny empty descriptions and non-actionable listings', () => {
  assert.equal(parseGig(fixture({ title: 'first', content_text: 'first' })), null);
  assert.equal(parseGig(fixture({ title: '242421', content_text: '242421' })), null);
  assert.equal(parseGig(fixture({ title: 'A reward for something', content_text: 'The reward is available and anyone can collect it.' })), null);
});
test('keeps explicit tasks even with low advertised rewards', () => {
  const gig = parseGig(fixture({ title: 'Fix README typo', content_text: 'Fix the typo in the documentation', _jobbi: { ...fixture()._jobbi, reward: {amount:0.01,currency:'USD'} }}));
  assert.equal(gig?.amount,0.01);
});
