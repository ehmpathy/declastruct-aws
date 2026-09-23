# F2 — the role name

**rework** · clean  ·  **status** · open  ·  **confidence** · 85%

## the fork, stated fairly

the wish leaves this open: *"it should read as whose reach it is and at what tier."* candidates:

| candidate | why not |
|-----------|---------|
| `ehmpathy-demo-for-grove` | **taken** |
| `ehmpathy-demo-grove` | reads as *the grove's demo role*, i.e. a badge the grove HOLDS. it does not. it is a role demo OFFERS the grove |
| `ahbode-demo-for-grove` | wrong org prefix — the role lives in an ehmpathy account, and every peer here reads `ehmpathy-*` |
| `ehmpathy-demo-camp-grove` | names the caller's home account, which the trust policy already names in full |
| `ehmpathy-demo-power` | names a tier this role does not sit on (see F1), and names no consumer |

## taken, and why at the time

**`ehmpathy-demo-for-grove`.**

it satisfies two families at once, which is why it wins on a fork with no strong argument either way:

- **this repo's family** — the extant peer is `ehmpathy-demo-oidc` (`resources.oidc.ts:44`), which
  reads `ehmpathy-<account>-<mechanism>`. an **absent** mechanism segment is the signal: this is not
  the federated path.
- **the paired repo's family** — ahbode declares `ahbode-prep-for-grove` / `ahbode-prod-for-grove`
  and documents the `-for-` slot explicitly: it *"states the ASSUMED relation, which keeps it
  distinct from `<camp-grove-role-name>`, the badge the grove HOLDS"*
  (`provision/aws.auth/resources.role-names.ts:27-38`).

⇒ `ehmpathy-demo-for-grove` is the ahbode form with our org and account substituted. an engineer who
knows either family reads it correctly on first sight.

## why the confidence is 85%

the two families agree, and the `-for-` slot has a written rationale in a peer org. the 15% is that a
role name is the most-referenced string this change produces — it appears in the caller-side policy
in another repo, in every runbook, and in cloudtrail — so a rename after the paired tree lands is a
two-repo change, never a one-repo one.

## rework, and why it is clean

⚠️ **clean only until the paired half merges.** before that: a rename here is one line. after: the
caller-side `sts:AssumeRole` resource arn in `ahbode/infrastructure` names it too, so a rename
becomes a coordinated two-repo change with a window where the reach is dead.

⇒ **this is the one fulcrum with a deadline.** if the wisher wants a different name, the cheap moment
is before the ahbode tree merges.

## 🔴 the name is not merely a REFERENCE — it is one half of the reach's BINDING

found at review round 5, and it raises this row's stakes beyond a rename cost.

**the two halves of one reach bind on different keys:**

| half | names the other by | resolves to |
|---|---|---|
| **ours** — the trust policy's `Principal` | the camp role's **arn** | aws stores the principal's **unique id** (`AROA…`) at write time |
| **theirs** — the identity policy's `Resource` | our role's **arn** | an identity-policy `Resource` matches **by arn string**, and an arn is keyed on the **role NAME** |

⇒ **so the name carries load at runtime, never merely at read time.** three consequences this fulcrum
owes:

1. **a delete-and-recreate is asymmetric.** it changes our role's unique id — which is why open
   question 6 expects our *own* trust policy to drift — while **their** grant re-attaches to the new
   role silently, because the arn string is unchanged.
2. 🔴 **a revoked name is a re-entry vector.** `case=7` `[t7]`: a role later created with this name
   inherits ahbode's live grant, with no change and no review in their tree.
3. 🔴 **F8's orphan holds that name.** `set.delete = null`, so the revoked role keeps the name
   occupied — one trust-policy line from re-open, with their grant already pointed at it.

⚠️ **so the rename deadline was the SMALLER of this row's two costs**, and it was the only one stated
until round 5. the larger is that **the name is a durable tie to a foreign tree that outlives the
role's own revocation.**

## 🔴 the name is also the ONLY fix-pointer that reaches an actor with zero permissions

surfaced by an ergonomist read of `case=2`. it adds a **second criterion** this entry had never
weighed, and it is the one that binds at the worst moment.

**the mechanism:** when the reach is half-wired or revoked, the clone gets AWS's `AccessDenied` —
text we cannot alter by one byte. that message ends:

```
... is not authorized to perform: sts:AssumeRole on resource: .../ehmpathy-demo-for-grove
```

⇒ **the role name is the one string we control that AWS places in front of the denied caller.**

⚠️ **and every other channel is out of reach at exactly that moment:**

| channel | why it fails the stranded clone |
|---|---|
| the role's `description` | needs `iam:GetRole` **in demo** — the access the cut clone by definition lacks |
| the repo-side note (exec-owes row 3) | needs a checkout; it reaches a provisioner, never a bare runtime |
| the console | needs a human and a login |

⇒ **so the name is the sole in-band signal.** `ehmpathy-demo-for-grove` happens to serve it well —
it names the consumer, which is the most useful fact a stranded reader could learn.

🔴 **what changes is the JUSTIFICATION, never the answer.** this entry had defended the name on
**the agreement of two families** — a read-time argument. that argument would trade the name away
for one that reads better in a declaration. ⇒ **a right answer held for the wrong reason is one
round from a wrong answer**, and this criterion is what pins it.

⚠️ **it does NOT move the confidence.** the same name wins under both criteria, so the fork is
unchanged; what the entry gained is a reason that holds at runtime rather than only at review.

## where

`provision/aws.auth/account=demo/` — the `name:` of the new `DeclaredAwsIamRole`.

## the verdict

_open._
