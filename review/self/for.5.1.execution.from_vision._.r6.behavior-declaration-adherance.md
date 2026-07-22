# self review r6 — behavior-declaration-adherance

two real deviations caught across the changed files, both FIXED this pass. led with the fixes,
not a defense.

## fix 1 — `describeOneParameter` fabricated identity/readonly values

`describeOneParameter.ts` built its return with `??`-defaults on aws-assigned fields:
`arn ?? ''`, `Version ?? 0`, `LastModifiedDate ?? new Date()`. arn is the PRIMARY key — an
empty-string primary key is a corrupt identity, not a valid param. that violates
rule.require.failfast + rule.forbid.unexpected-defaults.

fixed: each of the three now `UnexpectedCodePathError.throw`s with `{ name, metadata }` when
aws omits it. `name` keeps `?? input.name` (a known-good default — we filtered by that name).

## fix 2 — plain vs secure ops disagreed on the context type

`getOneSsmParameterPlain` + `setSsmParameterPlain` declared `ContextAwsApi & VisualogicContext`,
while the secure peers AND both daos declare `ContextAwsApi & ContextLogTrail`. it compiled only
because the dao's `ContextLogTrail` happens to satisfy `VisualogicContext` structurally — a
coincidence, not an intended contract, and an asymmetry between resources meant to be peers.

fixed: both plain ops now use `ContextAwsApi & ContextLogTrail` (import from `sdk-logs`, not
`visualogic`). all four param ops + both daos now share ONE context type.

proof for both: `rhx git.repo.test --what types` → passed (15s). no test/snapshot churn — fix 1
only changes a never-fired defensive branch; fix 2 is a type-signature alignment.

## what i checked and did NOT touch

- secure read path issues only `DescribeParameters` (no GetParameter, no decrypt); cast returns
  `value: undefined`. matches the vision — left unchanged.
- plain read uses `getOneParameter({ withDecryption: false })` — value-compare, no decrypt.
  matches the vision — left unchanged.
- `castIntoDeclaredAwsSsmParameterPlain.ts` — clean: passes value through, `assure` +
  `hasReadonly` guard the readonly fields. no defensive default, no `as` escape. no change.
- `type: metadata.Type as ...` in `describeOneParameter` — an `as` at the raw sdk boundary
  (allowed exemption), `type` not surfaced onto the domain object. left as-is.

## verdict

2 adherence deviations found and fixed (fabricated identity/readonly defaults; plain/secure
context-type mismatch). the vision's security behavior (no GetParameter/decrypt for secrets,
value-compare for plain, value undefined write-only) is implemented correctly and untouched by
the fixes.
