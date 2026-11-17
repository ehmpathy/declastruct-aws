# F3 — one statement with an action array, no condition

## .the fork
- A: widen the extant statement's `action` to an array of three
- B: add a second statement for `TagSession` + `SetSourceIdentity`
- C: either, plus an `sts:SourceIdentity` condition

## .taken
A. the issue and the collaborator's caller-side change use one array. a second statement breaks the extant `[t0] it holds exactly one statement` invariant and the revoke runbook's `Statement[0]` read-back. a condition would narrow the reach invisibly to the caller half, which prior fulcrum F9 of `v2026_09_06.feat-demo-trusts-ahbode-grove` ruled out.

## .rework
clean.

## .confidence — 95%

## .where
`resources.reach.ts`, `resources.reach.test.ts` [t0], `resources.reach.integration.test.ts` [t5].

## .verdict
ruled by the director, seed S1: as taken.
