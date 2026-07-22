# self review r2 — has-consistent-mechanisms

## question: do my new mechanisms duplicate extant utilities or diverge from peer patterns?

i searched the codebase per the guide, then interrogated each new mechanism. verdict: patterns
are consistent with peers; one honest duplication question surfaced and resolved below.

## the search

- ref-routing: `grep isUniqueKeyRef|RefByUnique|RefByPrimary` → 30 peer ops (vpcSubnet,
  ssoUser, ssoPermissionSet, vpc, ...) route by ref the same way. my `asSsmParameterName` +
  `asSsmParameterIdentifier` use the SAME `isRefByUnique`/`isRefByPrimary` primitives from
  domain-objects. consistent — not a new mechanism.
- arn parse: `grep ':parameter'` across src → NO extant "arn → parameter name" utility. the
  strip `arn.replace(/^.*:parameter/, '')` in `asSsmParameterName.ts:31,42` is the only such
  parse in the repo. so it does not duplicate a shared util — there is none to reuse.

## the honest duplication question: two transformers, similar shape

`asSsmParameterName` (secure) and `asSsmParameterIdentifier` (plain) both unwrap the same
`PickOne<{primary, unique, ref}>` shape. is that duplication i should collapse?

i say no, and here is why it holds:

- they DIVERGE in behavior, not just types. secure must yield the **Name only**, because
  `DescribeParameters`/`DeleteParameter` act by Name — so it strips the arn via regex. plain
  yields **Name-or-arn**, because `GetParameter` accepts either — so it passes the arn through
  untouched, no strip.
- they are each typed to their own resource (`...Secure` vs `...Plain`), matching the peer
  habit of per-resource ref operations (e.g. `getRefByPrimaryOfSsoUser` is sso-specific, not
  generic).
- rule.prefer.wet-over-dry: two instances with divergent logic is the wet zone (< 3 usages,
  behavior differs). a premature merge would need a flag to branch strip-vs-passthrough —
  exactly the "abstraction with a switch" the rule flags as a blocker.

so keeping them separate IS the consistent choice, not a lapse.

## the rest — mirrors peers verbatim

- **dao** via `genDeclastructDao` — same factory as `DeclaredAwsCloudwatchLogGroupDao` and the
  sso daos. no bespoke dao.
- **cast** via `assure(Dobj.as({...}), hasReadonly({ of: Dobj }))` — same shape as
  `castIntoDeclaredAwsCloudwatchLogGroup` and `castIntoDeclaredAwsSsoUser`.
- **sdk wrapper** `describeParameters`/`describeOneParameter` sits beside the extant
  `getOneParameter`/`setParameter` in `sdkSsm/index.ts`, same one-command-per-file shape.
- **set no-op + create guard** mirrors declastruct-github `setOrgSecret` field-for-field, as
  the vision mandates.

## verdict

0 mechanism duplications. ref-routing, cast, dao, and sdk-wrapper shapes all match extant
peers; the only repo-unique parse (arn→name) has no extant equivalent to reuse; the two
ref-transformers are consciously kept wet because their behavior genuinely diverges.
