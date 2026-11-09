# Toyol Decision Engine — Situtation, Strategy, Value and Learning

**9 November 2026. Status: installed and framework-tested; external earning has not been demonstrated.**

## What the decision engine does

Toyol now combines five distinct layers rather than confusing skill count with professional competence.

1. **Situation.** `src/situation.mjs` classifies the task, identifies missing acceptance evidence, distinguishes bounded repairs from human-dependent work and outlines alternative technical approaches.
2. **Source and rivals.** `src/symbol-search.mjs` searches actual repository symbols even without a filepath in the issue. `src/rival.mjs` inspects up to two linked competitor PRs, tracking changed files and testing-related paths **without claiming those PRs are correct or incorrect**.
3. **Solution and resilience.** Qwen2.5-Coder 3B sees bounded source context; `src/resilience.mjs` allows a second controlled attempt after patch-format/syntax failure. Code from unrelated downloaded repositories is not executed in the normal bounty drafting path.
4. **Evidence ledger.** `src/learning.mjs` records sanitized outcome categories across runs in [Toyol Learning Ledger](../issues/2). Repeated identical errors change future ranking and recommendations rather than permanently banning the issue. This is *decision memory*, not training of the underlying model weights.
5. **Value and monetization.** `src/opportunity.mjs` separates what a feed **advertises** from primary-source escrow evidence, independently verified payment acceptance, actual settlement and Malaysian cash-out. `src/brain-quest.mjs` uses economic and feasibility screening to choose which issues get limited inference compute.

## Four dimensions of an opportunity

| Dimension | What is measured | What must NOT be inferred |
|---|---|---|
| Technical feasibility | text clues about bounded repair, architecture or external dependency | guaranteed ability to complete, exact hours |
| Competition | related open PRs, explicit claims, discussion volume | rivals' defects, certainty of winning |
| Economic attractiveness | advertised amount, original funding evidence, human acceptance and MY payout checks | expected profit or probability of payout |
| Reusable value | reproducible patch, regression evidence, report and learned failure category | guaranteed portfolio quality, actual paid acceptance |

The 0–100 **review priority** is a relative screening rubric only. It is not a win probability, a forecast of USD, an hourly rate, or an AI competence score.

## The three money gates

**Advertised USD/USDC:** the source index says there may be a reward. This is *not* money held or payable to Toyol.

**Accepted and settled:** maintainer/platform confirmation and verifiable payment records are required. No such records have yet been produced by Toyol.

**Cashable in Malaysia:** requires documented withdrawal eligibility, usable account route, applicable verification and actual net receipt. The engine currently returns `prospective_take_home_myr: null` because this is **unknown**, not RM0 guaranteed and not a currency conversion estimate. Separately, verified earnings to date remain RM0.

There is no authorization to pay fees, buy subscriptions, open wallets, fabricate identity, submit third-party PRs or claim a bounty.

## Competitive resilience

A competing PR means *compare evidence*, not *flee*. However the system currently checks PR file overlap and whether related test files were touched. That is **not a semantic comparison of rival correctness**. Real quality superiority requires independent behavioral reproduction and tests, which are not yet established for external bounty repos.

The local model stays bounded to at most two attempts per issue. Network rate limits are deferred, not hammered. Untrusted issue text and comments cannot alter system permissions.

## Critical remaining delivery gates

- Produce an actual third-party issue patch **with relevant independent project tests**, not just syntax.
- Verify that project and bounty platform allow automated contributions.
- If submitting a patch, obtain explicit authorization and follow maintainer rules.
- Establish official acceptance plus payout records; until then earnings remain **RM0**.
- Observe the decision memory in multiple scheduled runs to show that repeated failures truly alter candidate selection.

**Repository boundary:** this system only modifies Toyol's own repository. MYReady Work A and Work B are not touched.
