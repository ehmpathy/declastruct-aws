# F4 — the file home

**rework** · clean  ·  **status** · open  ·  **confidence** · 80%

## the fork, stated fairly

where the new declaration lives. the wish calls its own suggestion a guess:
*"`resources.common.ts` as the home for any new bundle — a guess. it may belong beside the role instead."*

| candidate | why not |
|-----------|---------|
| a new `account=demo/resources.reach.ts`, aggregated by `account=demo/resources.ts` | **taken** |
| append to `account=demo/resources.oidc.ts` | that file's whole subject is the federated path — its `.what` reads *"github oidc resources for ci/cd access"*. a grove target has no federated principal, so it would make the filename a lie |
| append to `aws.auth/resources.common.ts` | that module is the **shared bundle** both accounts read. a role that exists in exactly one account is not common |
| a new top-level `provision/aws.reach/` | a third provision family for one role; the account is already the organizational axis here |

## taken, and why at the time

**a new `provision/aws.auth/account=demo/resources.reach.ts`, imported by the extant
`account=demo/resources.ts` aggregator.**

- it matches the folder's extant shape: `resources.<subject>.ts` files, one aggregator
  (`resources.ts`) that composes them — the same shape `account=.root/` uses across four files.
- it matches the paired repo's split for the same reason, stated there: the target factory lives
  *"beside the trust producer rather than in each account's oidc file, because a grove target is NOT
  an oidc resource — it has no federated principal. to keep it out of `resources.oidc.ts` is the
  whole point of the split"* (`provision/aws.auth/resources.reach.ts:107-109`).
- `reach` is the paired repo's declared domain term for this concept, so the filename speaks the
  vocabulary the two halves share.

## why the confidence is 80%

the argument is convention-matched on both sides, and the term is borrowed from a repo that declared
it. the 20% is that **`reach` is not yet a term of THIS repo's vocabulary** — no brief or source file
here uses it. to name a file after a foreign glossary is a small vocabulary import, and that import
is a real (if minor) architect-scale call the wisher may want to make instead.

## rework, and why it is clean

a file move plus one import line. no external consumer references the path. the aggregator absorbs
the change.

## where

`provision/aws.auth/account=demo/resources.reach.ts` (new) +
`provision/aws.auth/account=demo/resources.ts` (one import, one spread).

## the verdict

_open._
