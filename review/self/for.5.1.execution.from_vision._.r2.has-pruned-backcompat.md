# self review r2 — has-pruned-backcompat

## the question, sharpened

not just "did i add a shim?" but "does any line silently assume a legacy or alternate
representation, kept 'to be safe' without the wisher's ask?" i read the casts line by line to
find one. i found a real assumption to surface — below.

## the finding worth surfacing (open question for the wisher)

`castIntoDeclaredAwsSsmParameterSecure.ts:23`:

```ts
const keyId = input.keyId === 'alias/aws/ssm' ? null : input.keyId;
```

this hardcodes ONE representation of the account default key — the alias string
`alias/aws/ssm` — and folds it to `null`. it exists so a declared `keyId: null` converges to
KEEP against what `DescribeParameters` reports. that is correct for the default case the
vision names.

but it embeds two implicit assumptions i did NOT get explicit sign-off on:

1. **AWS always reports the default key as the literal `alias/aws/ssm`.** if a region/account
   ever returns the default key's full ARN or key-id instead of the alias, the fold misses →
   declared `null` vs cast `<arn>` → perma-diff. this is an assumption of a stable AWS
   representation, adjacent to a compatibility guess.
2. **a user never explicitly declares `keyId: 'alias/aws/ssm'`.** if they do (rather than
   `null`), the cast maps the read-back to `null` → declared `'alias/aws/ssm'` vs cast `null`
   → perma-diff, the opposite footgun.

**open question for the wisher:** is the fold of only the `alias/aws/ssm` literal sufficient,
or should the resource canonicalize the default key more defensively (e.g. treat both the
alias AND the resolved default-key arn as `null`, and fold a user-declared alias to `null`
too)? i did NOT expand it speculatively — that would itself be an unrequested compat layer.
flagged here for the wisher to decide rather than assumed.

## the rest — genuinely clean

- **no prior `DeclaredAwsSsmParameter`** existed, so there is no old field/shape/call site to
  preserve. this is net-new surface.
- `src/access/sdks/sdkSsm/index.ts` — the `describeParameters` exports are purely additive; i
  did not wrap or alter the extant `getOneParameter`/`setParameter`, so no dual-path
  compatibility crept in.
- provider + sdk-index registrations are additive; no export renamed or re-aliased.
- inputs follow the vision nullability convention with no extra optional added for a
  hypothetical old caller.

## verdict

1 surfaced assumption (the `alias/aws/ssm` fold) raised as an open question for the wisher —
NOT silently expanded into a compat layer. 0 unrequested back-compat shims elsewhere.
