---
name: produto
description: Discuss a mobile feature as a product before any design or code: user job, smallest valuable version, observable success criteria, product risks, and external dependencies. Use during feature planning to decide worthBuilding, reducedScope, and acceptanceChecks; do not use for visual direction, interaction design, code review, or market research (marketing owns evidence mining).
---

# Produto

Decide what deserves building and shape the smallest valuable version **before** design starts.
The deliverable is a set of product decisions the `feature_lead` copies into the brief — not a
document, not a roadmap, not UI.

Answer these questions in order and stop when they are answered:

## 1. User job

- What is the user trying to get done, in one sentence, at the moment they reach this feature?
- What do they do today without it (workaround, another app, nothing)? If the app already covers
  the job in another path, say so — that is a `worthBuilding="no"` argument.
- When market evidence from `$marketing` exists, anchor the job in quoted reasons; never invent
  demand.

## 2. Smallest valuable version

- Cut the feature to the minimum that completes the job end to end for one primary scenario.
- List what moves to a later version explicitly — that list feeds `reducedScope` and `outOfScope`.
- A cut that breaks the job is not a cut. Login without password recovery still completes the job;
  login without error states does not.
- For multi-user features (sharing, groups, invites), the smallest version still needs: a way in
  (invite/join), a way to see membership, and a defined behavior when the other person has not
  joined yet. Cold start and empty states are product decisions, not polish.

## 3. Observable success criteria

- Write acceptance checks a tester can verify on a screen or in app behavior — no metrics that
  require analytics, cohorts, or time ("retention improves" is not checkable tonight).
- Each criterion names the state before, the action, and the visible result.
- These become `acceptanceChecks`; vague ones ("works well", "is intuitive") are defects.

## 4. Product risks and edge cases

- Name the 3–5 riskiest assumptions: adoption ("will anyone create a group?"), coordination
  (two people editing the same item), trust (who can see what), reversibility (leave group,
  delete account), and platform rules (stores, permissions, background limits).
- For each risk: what the v1 does about it — handles it, constrains it (e.g. single owner,
  read-only members), or explicitly accepts it. Silence is not an option.

## 5. External dependencies

- List credentials, consoles, paid services, and backend capabilities the feature needs
  (e.g. Firebase project, google-services.json, dynamic links, push certificates).
- A missing dependency the agent cannot create is a **blocker to report**, never something to
  fake, stub silently, or "leave for later" without saying so.

## Rules

- Never invent downloads, revenue, retention, or user counts. Unknown is unknown.
- Do not design screens, flows, components, or visual direction — that belongs to
  `mobile-design` and `design_director` after the product cut is closed.
- Do not expand scope: the output is a smaller, sharper feature, not a bigger one.
- Keep each decision under 240 characters, ready to paste into the brief.

## Output

1. user job in one sentence;
2. `worthBuilding` verdict with the concrete reason;
3. smallest valuable version + deferred list (`reducedScope` / `outOfScope`);
4. observable `acceptanceChecks`;
5. risks with the v1 answer for each;
6. external dependencies, marking the ones that are blockers.

Stop after producing product decisions. Design and implementation follow in the same thread.
