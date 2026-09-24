# howto.revoke-grove-reach

## .what

how to end the ahbode camp grove's reach into the ehmpathy demo account — the role
`ehmpathy-demo-for-grove`, declared in `provision/aws.auth/account=demo/resources.reach.ts`.

## .why

the obvious gesture does not work. a revoke here is an **upsert** of a trust policy, in a
prescribed order, across two repos — and every step of that is non-obvious enough that an
operator who improvises will believe they revoked when they did not.

## 🔴 .read these three first

**1. deletion is NOT a revoke.** `DeclaredAwsIamRoleDao` declares `set.delete = null`. remove the
role from the wish and declastruct leaves it in place **and reports nothing** — no plan row, no
error, no signal. the role survives, its trust policy stays live, and so does every session already
issued under it. ⇒ **the quiet gesture is the dangerous one.**

**2. a revoke is TWO applies, never one.** a single plan runs its resources in declared array order,
which is the reverse of the order safety wants — and `applyChange` can throw mid-plan, which leaves
you half-revoked with no record of which half landed.

**3. a revoke is a TWO-REPO act.** ours alone leaves a live `sts:AssumeRole` grant in ahbode's
production tree aimed at a role that now denies. that is the exact half-wired state their own
invariant warns against.

## .the two applies, in order

⚠️ **two applies in THIS repo. a third act follows in ahbode's, and it is not one of the two** —
see `.then ahbode's half` below.

### act 1 — stop the LIVE session

**why first:** sts issues a bearer token with its own clock. a trust-policy edit gates the **next**
`AssumeRole` and cannot reach a token already handed out. that token keeps up to **1h** of life, and
under the reused bundle **that tail carries `iam:` writes** — so a hostile holder can spend it to
re-entrench faster than act 2 lands.

🔴 **act 1 has TWO shapes, and which one applies turns on an UNVERIFIED question.** vision open
question **11(d)** asks whether a stripped attachment ends a **live** session — iam evaluates a
session's permissions per call, so a deleted attachment should bite on the holder's next api call.
it needs a live reach to test, so it has not run.

| if 11(d)… | act 1 is | the plan row it renders | why |
|---|---|---|---|
| **holds** | **①a — strip the attachments** | `DESTROY` on the inline attachment AND on each managed attachment | wholly declarative, no writable tail, and **expressible today** — both attachment DAOs implement `set.delete` |
| **fails** | **①b — the `TokenIssueTime` deny** | `CREATE` on one new inline attachment | only an explicit deny reaches a token already issued |

⚠️ **the ORDER and the two-apply split hold either way.** what the branch changes is act 1's
gesture and its expected plan row; no other step in this runbook moves.

⇒ **prefer ①a and fall back to ①b.** ①a leaves no artifact to clean up afterward; ①b leaves a
`-revoked` attachment on the role forever, since the role itself cannot be deleted. so run ①a,
confirm the held token is dead, and reach for ①b only if it is not.

#### ①a — strip the attachments *(preferred; assumes 11(d) holds)*

delete the role's `DeclaredAwsIamRolePolicyAttachedInline` and each
`DeclaredAwsIamRolePolicyAttachedManaged` from the wish. **both DAOs implement `set.delete`**
(`DeclaredAwsIamRolePolicyAttachedInlineDao.ts:38`, `…AttachedManagedDao.ts:38`), so this is a real
declarative delete — unlike the role, whose `set.delete` is `null`.

⇒ **expect one `DESTROY` row per attachment and no other row.** the extant set is pinned at
`provision/aws.auth/account=demo/__snapshots__/resources.reach.test.ts.snap` — three rows today, so
act 1 owes **two** `DESTROY`s. read the snapshot before you read the plan; it is the only place the
expected shape is an artifact rather than prose.

⇒ plan, read the diff, apply. **then confirm the held token is dead** — retry an api call with it.
if it still succeeds, 11(d) fails: reach for ①b at once, and record the result against question 11(d).

#### ①b — the `TokenIssueTime` deny *(fallback; use when 11(d) fails)*

add a second inline attachment to the role, a `Deny *` keyed on `aws:TokenIssueTime` before the
revoke moment:

```ts
new DeclaredAwsIamRolePolicyAttachedInline({
  name: 'ehmpathy-demo-for-grove-revoked',
  role: refByUnique<typeof DeclaredAwsIamRole>(demoForGroveRole),
  document: new DeclaredAwsIamPolicyDocument({
    statements: [
      new DeclaredAwsIamPolicyStatement({
        effect: 'Deny',
        action: '*',
        resource: '*',
        condition: {
          DateLessThan: { 'aws:TokenIssueTime': '<the revoke moment, iso8601>' },
        },
      }),
    ],
  }),
})
```

⇒ plan, read the diff, apply. **then stop and confirm** before act 2.

⚠️ this is a **second statement on the PERMISSION policy**, never on the trust policy — the
one-statement invariant the trust policy carries is untouched.

### act 2 — close re-entry

**upsert** the role's `policies` array — strip the extant trust statement, write one that denies (or
one whose principal does not exist). do **not** delete the role.

🔴 **in the SAME edit, restate the intent.** the role's `description` and the readme's
*"the grove reach — what `resources.reach.ts` is for"* section both assert, in the present tense,
that this reach is live and wanted. leave them and both now lie.

⇒ **and that is not a tidiness point — it is the ONLY way to tell a revoked reach from a
never-wired one.** a revoked role and a role whose caller half has yet to merge emit a **byte-
identical** `AccessDenied`. the sole discriminator this repo has is whether the **stated intent
matches the trust policy**:

| the description says | the trust policy says | ⇒ read it as |
|---|---|---|
| the reach is wanted | it denies / names no live principal | 🔴 **revoked on purpose** — do NOT re-wire |
| the reach is wanted | it names the camp grove role | **not yet wired** — go merge ahbode's half |

⇒ so act 2 edits **three** things, never one: the trust statement, the `description`, and the
readme. plan, read the diff, apply.

⇒ **expect `UPDATE` on the ROLE alone, and every incumbent `KEEP`.** the role's identity row is the
first entry of the pinned set at
`provision/aws.auth/account=demo/__snapshots__/resources.reach.test.ts.snap`.

## 🔴 .the plan IS the guard — read it before EACH apply

the whole fail-safe of this procedure is a human who compares a real plan to a stated expectation and
**stops on a mismatch**. so the expectation must be stated where it cannot drift, and it is:

| apply | expect | and no other row |
|---|---|---|
| **act 1 — ①a** | `DESTROY` on the inline attachment AND on each managed attachment | ✅ |
| **act 1 — ①b** | `CREATE` on one new inline attachment (`…-revoked`) | ✅ |
| **act 2** | `UPDATE` on the ROLE alone; every incumbent `KEEP` | ✅ |

🔴 **a plan that does not match is a STOP, never a surprise.** and both intuitive delete gestures
mismatch it, which is what makes the read worth the minute:

| the gesture an operator reaches for | what the plan shows | why it mismatches |
|---|---|---|
| remove the role from `getResources()` | **no row at all** | act 1 owed `DESTROY`s and act 2 owed an `UPDATE`. silence is the mismatch |
| wrap the role in `del()` | `DESTROY` **on the ROLE** | act 2 owed an `UPDATE` on it. and this one **throws at apply**, possibly mid-plan |

⇒ **so the wrong gesture is caught at PLAN, and the apply that would throw is never run.**

⚠️ **the expected row COUNTS come from a checked-in artifact, never from this prose.** the declared
set is snapped at `provision/aws.auth/account=demo/__snapshots__/resources.reach.test.ts.snap` and
verified on every commit by `resources.reach.test.ts` `[t4]`. **read it first** — if the reach ever
gains a fourth resource, the snapshot moves and this table's counts do not.

## .then ahbode's half

open a PR against `ahbode/infrastructure` that removes the `sts:AssumeRole` statement naming our arn
from the camp grove role's `grove-reach` inline policy.

⇒ **until that lands, their tree still grants a reach our side refuses.**

## 🔴 .after — the role name is BURNED

their grant binds on our arn **string**. our trust policy binds on their principal's **unique id**.

⇒ **the two halves bind on different keys.** a later role that reuses the name `ehmpathy-demo-for-grove`
re-opens the reach with **no review on either side** — theirs still points at the string, and a fresh
role answers to it.

**so: never reuse the name.** the next grant to this collaborator takes a new one.

## .the first diagnostic step, when a reach fails

🔴 **the four-cause walk has ONE home, and it is not this file:**

⇒ **`provision/aws.auth/account=demo/readme.md` → *"you hit `AccessDenied` — start here"*.**

it holds the `aws sts get-caller-identity` filter, the four causes, which single one that filter
rules out, the `AWS_PROFILE`/imds mechanism behind the counter-intuitive first cause, and the ini
profile that prevents it.

⚠️ **it lives there and not here on purpose.** an operator who hits the error is usually NOT in this
repo's briefs — they are on a grove box with a failed assume, and they hold no demo credential. the
readme is on disk and reachable with none. **send a stranded operator there.**

⇒ the one line worth a repeat here, because it decides whether this brief is the right file to be in
at all:

| the arn `get-caller-identity` prints | ⇒ |
|---|---|
| the box's own **camp grove role** | the assume never took effect. this is not a revoke question — go to the readme, cause 1 |
| `ehmpathy-demo-for-grove` | the assume worked, so the other three causes are indistinguishable from the outside. go to the readme's **step 2** — its intent test is what tells a deliberate revoke from a not-yet-wired reach |

## .see also

- `provision/aws.auth/account=demo/resources.reach.ts` — the declaration, with this brief's core
  restated at the trust statement
- `provision/aws.auth/account=demo/readme.md` — the reach's intent, the handoff arn, the
  grove-box setup
- `howto.reapply-demo-oidc-role` — the sibling procedure for the same provision; same two
  commands, same interactive-sso caveat
- `.behavior/v2026_09_06.feat-demo-trusts-ahbode-grove/1.vision.experience.case=7.the-reach-is-revoked.md`
  — the walked revoke experience this runbook discharges
