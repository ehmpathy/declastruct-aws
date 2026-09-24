# F15 — the permadiff root is the planner's compare, not a cast

**stage** · `5.3.verification` · **rework** `clean` · **confidence** 95% · **status** ruled

## the fork, stated fairly

the wisher reported a **live permadiff** on the camp reach — a plan row that reads `UPDATE` on a
policy nobody edited — and directed the fix.

the mechanism is settled and clamped: `computeChange` compares
`serialize(omitReadonly(x))`, which is **shape-sensitive**, while `action`, `resource`, and
`principal.aws` are each `string | string[]` and both casts pass the value **verbatim**. iam treats
`'x'` and `['x']` as identical and does not promise to echo the shape it was given. so a flip in
transit is permanent.

⇒ four branches:

| # | branch | where it lives | verdict |
|---|---|---|---|
| ① | fold every arm in the read cast — `action`, `resource`, `principal` | `declastruct-aws` | ⛔ **falsified empirically** — see below |
| ② | fold `principal` alone | `declastruct-aws` | ⛔ **reverted.** taken, then struck by the wisher |
| ③ | make the fields a **LIST** in the domain type | `declastruct-aws` | ⛔ breaks a published contract, and narrows what a consumer may declare |
| ④ | 🔴 **canonicalize BOTH sides before the compare** | **`declastruct`** | ✅ **taken** |

## 🔴 taken — ④, and the wisher ruled it

> *"why dont you fix the permadiff upstream instead of a narrow of what we allow? just sort both
> sides / before comparison"* · *"absolutely none of this arbitrary make scalar bullshit"* ·
> *"solve it at root instead"*

**①–③ are all the same error at three depths: each narrows what a DECLARATION may say, to work
around a defect in the COMPARE.** ② was the narrowest of them and still had that shape — it made a
scalar declaration immune and left a list-of-one exposed, so the repo then grew a scalar convention
plus a guard test to enforce it. that convention was the tell: a rule that exists to keep a
declaration in the one shape the planner happens to handle.

⇒ the root is the planner's equivalence check, because it is **the one place both sides are in
hand**. a cast holds only the remote side, which is why every cast-level branch trades one
permadiff for another.

### the fix

`declastruct` · `src/domain.operations/plan/computeChange.ts` · `checkAreResourcesEquivalent`:

```ts
const remoteSerialized = serialize(canonicalize(omitReadonly(input.remote)), { orderless: true });
const desiredSerialized = serialize(canonicalize(omitReadonly(input.desired)), { orderless: true });
```

two arms, both symmetric — applied identically to each side, so they change no written document and
cannot break a caller:

| arm | closes | note |
|---|---|---|
| **sort** — `serialize(x, { orderless: true })` | `['a','b']` vs `['b','a']` | ✅ **domain-objects already ships the flag.** the planner simply does not pass it |
| **fold** — a one-element array to its bare value | `'x'` vs `['x']` | needs the small helper; a sort alone does not reach it |

## what was reverted here

| artifact | state |
|---|---|
| `src/domain.operations/iamRole/castIntoDeclaredAwsIamPrincipal.ts` | ✅ reverted to `origin/main` |
| `castIntoDeclaredAwsIamPolicyStatement.ts` — the verbatim `.note` | ✅ cut |
| `provision/aws.auth/resources.common.ts` — four scalar conversions + the convention note | ✅ reverted |
| `provision/aws.auth/resources.common.roundtrip.test.ts` `[t1]` — the scalar guard | ✅ cut |
| `castRoundTripIamPolicyStatement.test.ts` `[case6]`/`[case7]` | ✅ replaced by one `[case6]` that pins all four arms as red-when-fixed |

⇒ **`src/` is now unchanged by this branch**, which also restores the wish's own bound.

## why ① was falsified, and why that fact still matters

the first fix applied the fold to `action`/`resource` as well. the full run came back **1302 passed,
1 failed**, and the one failure was `resources.common — the bundle round-trips`:
`demoPermissionsPolicy` declared **four lists of one**, so a blanket fold in the read cast
**creates** the permadiff it looks like it prevents.

🔴 **that is the empirical proof that the fix cannot live in a cast.** a cast sees one side, so any
canonicalization it performs is asymmetric by construction. ④ is symmetric, so the same input that
falsified ① passes under it.

## rework, and why

`clean` — the revert here is complete and `src/` is back to `origin/main`. the upstream change is
nine lines in one function, guarded by a `length === 1` check and a flag domain-objects already
exposes; its removal is a revert. 🔴 and the exposure column is clean: a wrong canonicalization
produces a loud red suite, never a live credential.

## confidence, and why it is not 100%

**95%.** the mechanism is proven in-repo at three grains — statement, document, attachment — the
falsification of ① is empirical, and `[case6]`'s four arms pin the defect so the upstream fix has a
ready red-to-green check.

- ⚠️ **iam's actual collapse behavior is asserted from documentation, never measured here.** the
  apply that would settle it needs an **interactive SSO login** an agent cannot perform. `[case6]`
  proves the compare is shape-sensitive; it does not prove iam flips the shape
- ⚠️ the sort arm may surface a resource family where array ORDER is semantic. none is known in
  `declastruct-aws`, and the upstream change owes that walk across every provider

## where

| artifact | what it holds |
|---|---|
| `declastruct` `src/domain.operations/plan/computeChange.ts` | 🔴 **the fix, and it is not in this repo** |
| `src/domain.operations/iamRole/castRoundTripIamPolicyStatement.test.ts` | `[case6]` — four arms, each `toEqual(false)`, red the day the root lands |
| `src/domain.operations/iamRolePolicyAttachedInline/castRoundTripIamRolePolicyAttachedInline.test.ts` | the attachment grain — the one the reported `UPDATE` row named |
| `provision/aws.auth/resources.common.roundtrip.test.ts` | `[t0]` — the whole bundle round-trips |

## the verdict owed

🔴 **the upstream change is a `declastruct` PR, and it is not this route's to land.** what this
stone owes is the raise, the pinned reproduction, and the exact patch — all three are above.

## .see also

- `../5.3.verification.yield.md` — the stage this was found in
- `../blocker/5.3.verification.md` — the credential wall that also blocks a measurement of iam's flip
- `.dream/v2026_09_18.fix.declastruct-canonicalize-before-compare.md` — the dispatch
