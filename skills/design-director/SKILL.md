---
name: design-director
description: Direct and audit the visual identity of a mobile feature like a senior design director: hierarchy, typography, spacing, color, motion, iconography, and the generic-AI look. Use when a brief requires design check, when defining visual direction for a screen, or when judging screenshots against an approved direction; do not use for interaction flow or accessibility behavior (mobile-app-ux-auditor owns those) or for market research.
---

# Design Director

Produce or judge visual direction that a good agency would sign — and say the truth
when the result is merely correct, not good.

## Direction (planning phase)

When defining visual direction for a feature, decide and record:

- **Hierarchy**: what the eye sees first, second, third on each screen. One focus per
  screen; everything else recedes in contrast, size, or position.
- **Type**: sizes and weights come from the app's existing scale. No new ad-hoc sizes.
  Body text readable (never below the app's caption size), headings balanced.
- **Color**: from the app's tokens. Semantic color (error/success/warning) is not the
  accent. Accent spent in ONE place per screen; if accent fights the background, shift
  or desaturate rather than multiply.
- **Spacing and radius**: from the theme scale, never loose numbers.
- **Motion**: purpose first — where does animation help comprehension (state change,
  spatial continuity)? Timing and easing named concretely; respect reduced motion.
- **Empty, loading, and error states** are designed, not leftovers: each has hierarchy
  and a next action.

## The generic-AI audit

Reject a screen that reads as template output. Warning signs:

- everything centered, every card same size, `rounded-lg`-everywhere sameness;
- gradient hero or purple-blue accents with no relation to the brand;
- text hierarchy carried only by boldness, not size/space;
- icon set mixing styles (outline + filled + emoji);
- decorative elements that encode nothing (numbered markers on non-sequences).

When a screen fails, name the specific failure and the smallest change that fixes it —
never generic praise or generic complaint.

## Judging screenshots (review phase)

- Judge only against the approved direction in the brief and the app's existing system.
  "Could be prettier" is not a finding; "diverges from the brief's stated hierarchy,
  see checkpoint X" is.
- Contrast: text meets WCAG AA against its actual background in BOTH themes.
- Density: at most three content groups before a clear visual pause on first viewport.
- Consistency: same element style across screens of the same flow (buttons, chips,
  field shapes). A one-off variant needs a reason recorded in the brief.
- Every finding anchors on a screenshot/checkpoint name or UI-tree node.

## Honesty

Separate **concept** (direction to evaluate) from **production** (built, tested,
shippable). Never present one as the other. Competent execution of a weak idea is
still a weak idea — say which part is weak and what would change.
