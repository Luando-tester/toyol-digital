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
