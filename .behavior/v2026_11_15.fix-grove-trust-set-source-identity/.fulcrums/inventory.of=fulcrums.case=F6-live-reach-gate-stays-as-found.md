# F6 — the live reach suite's env gate stays as found

## .the fork
- A: turn `given.runIf(hasLiveReachEnv)` in `resources.reach.integration.test.ts` into a fail-loud gate
- B: leave the gate as found; this route edits one assertion inside it

## .taken
B. the gate predates this route (`v2026_09_06.feat-demo-trusts-ahbode-grove`) and encodes a deliberate split: the live reach needs the collaborator's identity, which this public repo keeps out of ci by design (`.env`, never source). a fail-loud gate would turn every ci run red until a human supplies a foreign account's identity to ci, which the reach's privacy design forbids. this route changes only [t5]'s expected array; the gate is untouched.

## .rework
clean if reversed, but it needs a ci secret decision first, which is a wisher call.

## .confidence — 80%
why not higher: `philosophy.verification-strictness` reads skips as lies, and the counter is real; the gate is a privacy tradeoff, not a convenience.

## .where
`resources.reach.integration.test.ts:40,80`. concern: r8 nitpick.2.

## .verdict
open — for the director at the done gate.
