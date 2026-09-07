---
name: firebase-rn
description: Conventions and review checklist for Firebase (Auth, Firestore) in React Native apps: native module wiring, listener lifecycle, security rules, offline behavior, and abuse limits. Use when implementing or reviewing code that touches @react-native-firebase Auth/Firestore, login/session flows, or shared data sync; do not use for UI styling or market questions.
---

# Firebase + React Native

Conventions for this codebase. In review, each violation is a finding with file:line.

## Wiring (why builds break)

- `@react-native-firebase/*` are NATIVE modules: adding or upgrading one requires a
  native rebuild (`gradlew installDebug`) — JS reload is not enough. "Native module
  not registered" at runtime means stale binary, not broken JS.
- `google-services.json` must be issued for the app's exact `applicationId`; the
  google-services gradle plugin must be applied. Never "fix" a mismatch by renaming
  the app's applicationId.

## Auth

- One source of truth for session: `onAuthStateChanged`. UI never assumes a user
  between mount and the first callback — model the explicit `unknown` state.
- Every `onAuthStateChanged`/`onSnapshot` subscription returns its unsubscribe and is
  cleaned up on unmount (useEffect return). A leaked listener is a finding.
- Auth errors map to user language by `error.code` (wrong-password, user-not-found,
  network-request-failed, **too-many-requests**); never show raw Firebase messages.
- `too-many-requests` is Firebase anti-abuse, NOT an app bug: back off and tell the
  user to wait — do not retry in a loop, do not "fix" the form.
- Sign-out clears in-memory user state but must NOT delete local-only data the user
  created before having an account.

## Firestore (shared data)

- Model membership explicitly (memberIds array or members subcollection); every read
  the UI does must be allowed by a security rule that checks membership — client-side
  filtering is not access control.
- Conflict policy is last-write-wins unless the brief says otherwise; concurrent
  edits must not crash or duplicate.
- Snapshots drive the UI; one-shot `get()` only for actions. Handle
  `hasPendingWrites` states so offline writes don't look lost.
- Unbounded queries are findings: paginate or hard-limit list queries.
- Never store secrets or other users' private data in documents readable by members.

## Testing constraints (for the orchestrator)

- Repeated wrong-password attempts trip anti-abuse: at most ONE wrong-password
  evidence capture per run; use unique throwaway emails per run for signup evidence.
- Prefer the Firebase Auth/Firestore Emulator for heavy automated flows when
  configured; against production, keep test volume minimal.
