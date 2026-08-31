---
name: marketing
description: Research current App Store and Google Play competitors, extract evidence-backed strengths and weaknesses, and assess feature positioning before mobile implementation. Use when a feature needs competitor, category, positioning, store-listing, or market-fit context; do not use for applied visual review, generic styling, or unsupported revenue estimates.
---

# Marketing

Produce current, evidence-backed context that improves a mobile feature without encouraging imitation. Separate observed facts, user-review patterns, and inference.

Use before implementation. Research up to five relevant competitors and answer:

- how each app positions the same user problem;
- which feature patterns are prominent in store listing and public product material;
- strengths, weaknesses, pricing signals, trust signals, and recurring review themes;
- unmet needs or differentiation opportunities;
- implications for feature scope, UX copy, onboarding, retention, and promotion.

Return only decisions that can change the feature. Do not create a generic market report.

Stop after producing market context. Pass findings to `feature_lead` before planning. Applied screenshots and implementation quality belong to `ux_auditor`, not this skill.

## Research rules

- Use live web research. Record direct URLs and access date.
- Prefer official App Store, Google Play, product, pricing, release-note, and support pages.
- Use reviews as qualitative signals, not representative statistics. Note when evidence is anecdotal.
- Verify app identity, platform, country/storefront, and recency before comparing.
- Never invent downloads, revenue, conversion, retention, rankings, ratings, pricing, or market share.
- If a metric is unavailable, label it unknown.
- Distinguish observation from inference explicitly.
- Use no more than five competitors and three findings per competitor.
- Avoid long quotes and copied store descriptions.

## Selection

Prefer competitors that match at least two of these:

- same user job;
- same category or monetization model;
- similar target audience;
- same platform or geographic market;
- direct substitute for the feature being implemented.

Include an adjacent competitor only when its pattern supplies a useful contrast. Explain why it belongs.

## Output

Keep output compact:

1. market summary;
2. competitor evidence;
3. strongest opportunities and risks;
4. concrete context for `feature_lead`;
5. sources with URLs and access date.
