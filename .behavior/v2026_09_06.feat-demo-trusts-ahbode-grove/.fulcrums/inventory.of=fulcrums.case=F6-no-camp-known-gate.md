# F6 — no camp-known gate

**rework** · clean  ·  **status** · open  ·  **confidence** · 82%

⚠️ **this entry carries THREE picks on one subject**, each opened by a later read, and the first fork
asked only the first:

| axis | the question | verdict |
|---|---|---|
| 1 — **lives** | gate the declaration, or a plain constant? | a constant (82%, above) |
| 2 — **repeated** | where may the literal appear? | source + evidence record; out of prose |
| 3 — 🔴 **sourced** | could it be derived rather than recorded? | the **arn** yes, the **account id** never |

⇒ **a fulcrum's title names the axis it settled, and is silent about the axes beside it.** all three
sit under *"the camp arn"* and only the first was asked when this entry was written.

## the fork, stated fairly

the paired repo gates its whole target role on a runtime check:

```ts
if (!isCampAccountKnown()) return [];   // resources.reach.ts:32
```

with the stated reason: *"an iam role with an empty trust document is rejected by aws as
malformed"*, so before the camp account existed the role could not be declared at all
(`provision/aws.auth/resources.reach.ts:23-27, 110-112`).

| candidate | why not |
|-----------|---------|
| declare the role unconditionally; the camp arn is a plain `const` | **taken** |
| mirror ahbode's `isCampAccountKnown()` gate | the condition it guards is already satisfied and cannot un-satisfy |
| gate on an env var | the paired repo argues against exactly this — a code constant *"can only change on a reviewed code edit, never on a forgotten env var"* (`resources.reach-arns.ts:22-25`) |

## taken, and why at the time

**declare unconditionally.** the camp account **exists**: `ACCOUNT_ID_CAMP = '<camp-account-id>'`, filled,
read from `ahbode/infrastructure` at `origin/main` on 2026-09-06
(`provision/aws.auth/resources.reach-arns.ts:27`). the arn is verified as
`arn:aws:iam::<camp-account-id>:role/<camp-grove-role-name>`, composed from that id and
`CAMP_GROVE_ROLE_NAME` (`provision/aws.infra/account=camp/constants.ts:137`).

ahbode's gate is a **bootstrap** device for a window that has closed. it guards a state — *"camp does
not exist yet"* — that cannot recur: an aws account id is permanent once issued, and the account is
live. to import the gate would be to import a conditional whose false branch is unreachable, which
is a code path with no purpose and a small cost forever (`rule.require.fewer-paths-via-idempotency`).

⚠️ **the wish told us to re-verify this arn** rather than trust its quotation, and the re-verify is
what makes the gate's removal safe. it was re-read, not assumed.

## why the confidence is 82%

the fact is verified from live source and the permanence argument is sound. the 18% is a **staleness
window**: the read was against `origin/main` of a foreign repo on one day. if the camp account is
ever rebuilt under a new id, this repo holds a silently-wrong principal and the reach dies with an
`AccessDenied` that looks exactly like `case=2`. the mitigation is a source comment that names the
date and the file the value came from — cheap, and it turns a mystery into a lookup.

## 🔴 the second axis this entry never weighed — WHERE the literal value may appear

the fork above is *"gate or constant"*, and it settled where the value **lives**. it never asked
where the value may be **repeated**, and a review read caught an asymmetry that reads badly:

| whose account id | how this repo treats it | why |
|---|---|---|
| **ours** (demo) | 🔴 **kept out of source** — read from live creds at apply time | **F3**, a deliberate pick |
| **theirs** (camp) | ⚠️ hardcoded in source, and repeated verbatim in the vision's prose | this entry, by convenience |

⇒ **we are careful with our own and casual with a foreign org's**, in a repo that ships to npm.

**the three facts that bound the concern:**

- **an aws account id is not a secret.** it appears in every cross-account arn by design, and it
  identifies an org's account, never a person. so this is not a leak in the strict sense.
- **ahbode publishes it themselves**, filled, under their own stated hardcode convention
  (`resources.reach-arns.ts:27`). we disclose naught they treat as closed.
- 🔴 **but our own open question 9 turns an arn in a trust policy into an EXISTENCE ORACLE.** aws
  validates a principal at write time — that is question 9's whole premise — so the value is not
  merely a reference; it is a confirmed statement that the principal is live right now. that plus
  an account id is a real, if small, enumeration aid.

⚠️ **and *"they published it"* is a fact about their tree on one day, never a licence for ours.**
it is the same staleness the 18% above already names, applied to a different property.

**taken: one place in source, one in the evidence record, and out of the prose.**

| surface | carries the literal? | why |
|---|---|---|
| the **constant** in `resources.reach.ts` | ✅ yes | a cross-account trust IS an arn. there is no way around it and no reason to want one |
| the **groundwork citation** | ✅ yes | that section's whole job is to record what was verified, and from where |
| the vision's **prose** | ⛔ no — *"the camp grove role"* | prose needs the referent, never the value. this is the doc read most casually and quoted most freely |
| the **`case=N` demos** | ✅ yes | ⚠️ **a demo of an `AccessDenied` must show the string the actor ACTUALLY sees.** `case=2` `[t1]`'s whole finding is that four causes emit byte-identical text; a symbolic arn would make that claim unfalsifiable |

⇒ it is free, and it removes the asymmetry from the surface where it is least justified.

⚠️ **the boundary, stated plainly: a literal is kept where its EXACTNESS is the point** — an error
message, a verified citation, a declaration — **and dropped where a referent would serve.**

## 🔴 the third axis — could the value be DERIVED rather than recorded at all?

the natural next ask, and it splits into two questions the word *"derivable"* fuses:

### the ARN is derivable. the ACCOUNT ID is not, and cannot be.

ahbode already composes the arn from two atoms rather than repeats it —
`arn:aws:iam::${ACCOUNT_ID_CAMP}:role/${CAMP_GROVE_ROLE_NAME}` (`resources.reach-arns.ts:15-49`).
⇒ **this repo should mirror that**: record two atoms, derive the arn, never repeat the composed
string. that is a real reduction and it costs one builder.

🔴 **but the account id itself is irreducible, and the reason is structural rather than a
convenience.** compare it to **F3**, which is what makes the asymmetry look careless:

| whose id | how it is obtained | why that works |
|---|---|---|
| **ours** (demo) | `sts:GetCallerIdentity` at apply time | ✅ we **are** that account when we apply |
| **theirs** (camp) | ⛔ no api resolves it | we are **never** camp, and Organizations `ListAccounts` reads our own org alone |

⇒ **F3's derivation is available only because the caller is the subject.** the moment the subject is
a foreign org, every derivation channel closes. ⚠️ **so the asymmetry is FORCED, not chosen** — which
is a materially better answer than the *"convenience"* this entry first recorded.

### the dynamic-source ladder, and why the rungs below a constant are worse

| source | derivable? | who can change it | verdict |
|---|---|---|---|
| the composed arn, repeated N times | — | reviewed code edit | ⛔ repeats the value; use the builder |
| **two atoms + an arn builder** | ✅ the **arn** is | reviewed code edit | 👍 **taken** — ahbode's shape |
| an env var | ⛔ | anyone with deploy-env access, **unreviewed** | the paired repo argues against exactly this (`:22-25`) |
| 🔴 **an SSM parameter in demo** | ⛔ | **the grove role itself** | 🔴🔴 **forbidden — see below** |
| a live fetch of ahbode's repo at plan time | ⛔ | a foreign tree, at plan time | a plan that is not reproducible, and a network dependency on the read path |

### 🔴🔴 the SSM option is a privilege-escalation LOOP, and it is the sharpest find here

it is the tempting rung — this repo **has** `DeclaredAwsSsmParameterPlain`, so *"read the camp arn
from a param"* looks like the declarative answer. it is not:

`demoPermissionsPolicy` grants **`ssm:PutParameter` on `resource: '*'`**
(`provision/aws.auth/resources.common.ts:257,265`) — and that bundle is **what the grove role
carries**. so a param that decides **who may assume the grove role** would be writable **by the grove
role**.

⇒ **the credential could rewrite the value that governs who may hold it.** that is `case=5` `[t2']`'s
defect — a grantee that can rewrite its own gate — reached by a second route, and this one would be
introduced by us rather than inherited from the bundle.

⚠️ **and it would be silent.** a param write leaves no plan row and no diff in this repo; the next
apply would simply read a different principal and reconcile to it. ⇒ **a trust principal must be
governed by a reviewed code edit**, which is precisely the reason the paired repo already gives for
its constants — and this find gives that reason teeth it did not have.

### what the constant DOES get, for free

🔴 **aws validates the principal at write time** — that is open question 9's whole premise. so a
constant is not merely *"recorded and hoped for"*: if the camp account is ever rebuilt under a new
id, the next apply **fails loud** rather than a silent write of a dead principal.

⚠️ **the guarantee is bounded, and question 6 names the bound**: it bites on a **fresh write**. a
policy already written whose principal is later deleted degrades to a raw `AROA…` id instead. ⇒ the
constant is validated at declare time and drifts silently thereafter — which is exactly the 18%
staleness window above, now with its mechanism named.

## rework, and why it is clean

to re-add a gate later is additive. to change the constant is one line. to re-literalize the prose is
a find-and-replace.

## where

`provision/aws.auth/account=demo/resources.reach.ts` — the camp principal arn constant.

## the verdict

_open._
