# self review r4 — has-consistent-conventions

## the real, deeper catch: the two peer resources DIVERGE on delete

i opened both daos side by side. they share all but one line — and it is an asymmetry:

- `DeclaredAwsSsmParameterPlainDao.ts:35` → `delete: null`  (NO delete)
- `DeclaredAwsSsmParameterSecureDao.ts:37-39` → `delete: async (...) => delSsmParameterSecure(...)`  (delete wired)

so Secure gets a `del` op + a folder file (`delSsmParameterSecure.ts`) and a dao delete; Plain
gets neither. two resources that are meant to be symmetric peers (same service, same shape,
same nullability convention) carry a DIFFERENT operation set. that is a convention divergence
BETWEEN the peers, not just from the wider repo.

## why it is this way — and why it is a live open question, not a settled choice

this is not accidental. the vision's own open-questions section flags it, unresolved: it asks
whether to replicate github's `delOrgSecret` (a real `DeleteParameter`) or set `delete: null`
like the peer SSM daos, and tilts toward github's del without a firm decision.

my code split the difference: Secure replicates github (has `del`), Plain follows the peer SSM
daos (`delete: null`). that is DEFENSIBLE per the two precedents, but it leaves the two peers
inconsistent with each other, which is the exact smell this review hunts for.

**open question for the wisher (surfaced, not silently settled):** should the peers be
symmetric on delete? two clean resolutions:
1. give Plain a `delSsmParameterPlain` + dao delete too (both replicate github), or
2. drop Secure's delete to `null` as well (both follow the peer SSM-dao precedent).

i did NOT force either, because the vision itself leaves it open and tilts one way without a
firm decision. i flag it here so a reviewer/wisher settles the symmetry deliberately rather
than inherit a half-and-half state.

## the other divergence (condensed from r3, still holds)

the sdk wrapper `describeOneParameter` uses a `describe` verb absent from the get/set/del
sdk-peers — justified because it mirrors AWS's metadata-only `DescribeParameters` and keeps the
no-value/no-decrypt boundary legible at the call site (a security-motivated, conscious break).

## what is genuinely consistent (re-verified)

- **folders**: `ssmParameterPlain` / `ssmParameterSecure` are camelCase, same as peer folders
  (`cloudwatchLogGroup`, `ssoUser`).
- **domain-object names**: `DeclaredAws<Service><Resource>` symmetry; the Plain/Secure suffix
  is the vision's prescribed split.
- **op verbs**: get/set/cast/del + `as*` transformers — the peer verb set, one op per file,
  filename === op name.
- **no minted synonyms**: `value`, `keyId`, `arn`, `version`, `tags` reused from peers.

## verdict

2 conscious divergences surfaced: (1) the Plain-vs-Secure delete asymmetry — raised as an
OPEN [wisher] question because the vision itself left it unresolved; (2) the `describe` sdk
verb — justified on security-legibility grounds. all other names, folders, and structure match
peers.
