# F1 — add `sts:TagSession` beside `sts:SetSourceIdentity`

## .the fork
- A: add `sts:SetSourceIdentity` alone, as the wish's title states
- B: add `sts:SetSourceIdentity` and `sts:TagSession`, as issue #129's body states

## .taken
B. the issue records a live measurement from the hetzner grove: AccessDenied on `sts:SetSourceIdentity`, then on `sts:TagSession` once the first was allowed. A would ship a fix that fails at the second hop. aws's roles anywhere trust model lists all three actions together.

## .rework
clean: drop one string from the action array, one test literal, one snapshot.

## .confidence — 92%, why not higher
the issue opened at 2026-11-16T01:20Z, the wish's own timestamp, and its timeline shows one `renamed` event at 01:36Z: the title gained `sts:TagSession` sixteen minutes after the wish was cut. so the wish trails the measurement. the residual 8%: the commander may want the two actions shipped as separate changes. he confirms in the walkthrough.

## .where
`provision/aws.auth/account=demo/resources.reach.ts` trust statement.

## .verdict
ruled by the director, seed S1: as taken.
