---
name: marketing
description: Mine real user reviews of competing mobile apps to explain why people install, why they stay, and why they quit, and turn that into feature, copy, and pricing decisions. Use when a feature needs churn, adoption, positioning, paywall, or market-fit context; do not use for applied visual review, generic styling, or unsupported revenue estimates.
---

# Marketing

Produce current, evidence-backed context that improves a mobile feature without encouraging imitation.

The deliverable is **reasons in the user's own words**, not a feature checklist. A table saying a
competitor has streaks, widgets, and AI explains nothing: every competitor has them. A review saying
"I always fall behind the yearly plan and then I just give up" is a product decision.

Use before implementation. Answer three questions about competing apps:

1. **Why did people install?** What problem were they trying to solve, in their words.
2. **Why do they stay?** What made it worth keeping, and what the habit looks like.
3. **Why did they quit?** The exact moment it broke: a bug, a missing feature, a pace they could not
   keep, or the price itself.

The third question carries the most product value. The first supplies store and onboarding copy.

## Research rules

- Use live web research. Record a direct URL and an access date for every signal.
- Go past App Store and Google Play. Reddit, forums, video comments, and review posts usually carry
  longer and more specific text than store reviews.
- Quote verbatim and short: at most 200 characters, attributed to the app and source.
- Mark a reason `recorrente` only when it appears across different people or sources; otherwise
  `isolado`.
- Reviews are a biased sample — angry and delighted users, not the median. Record the pattern
  observed, never a frequency or a percentage of users.
- Separate a temporary complaint (a bug, a bad release) from a structural one (the product model,
  the pace, the price).
- Verify app identity, platform, storefront, and recency before comparing.
- Never invent downloads, revenue, conversion, retention, rankings, or market share. Label unknown
  metrics as unknown.
- Distinguish observation from inference explicitly. Opportunities and risks are inference.
- Translate a quote only when the original is neither Portuguese nor English; keep the meaning.

## Pricing and paywalls

Price is one of the most common abandonment reasons and one of the least documented. Record:

- where the paywall appears in the flow and what stays free;
- the current price with its access date;
- the reaction — refusal, acceptance, regret, refund requests, "I only found out it was paid later";
- cases where the charge drives away people who liked the product.

## Selection

Prefer competitors that match at least two of these:

- same user job;
- same category or monetization model;
- similar target audience;
- same platform or geographic market;
- direct substitute for the feature being implemented.

Include an adjacent competitor only when its pattern supplies a useful contrast. Explain why it
belongs.

## Output

Keep output compact and stop when reasons start repeating:

1. lane summary;
2. signals — quote, what it reveals, app, source, access date, recurring or isolated;
3. strongest opportunities and risks;
4. concrete context for `feature_lead`.

Stop after producing market context. Pass findings to `feature_lead` before planning. Applied
screenshots and implementation quality belong to `ux_auditor`, not this skill.
