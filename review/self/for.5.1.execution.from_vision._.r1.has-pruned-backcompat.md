# self review r1 — has-pruned-backcompat

## question: did i add unrequested backwards-compatibility?

verdict: none. this is net-new surface with no prior version to stay compatible with.

## the analysis

`DeclaredAwsSsmParameterPlain` and `DeclaredAwsSsmParameterSecure` are brand-new resources.
there is no prior `DeclaredAwsSsmParameter` shipped, so there is no old shape, no old field, no
old call site to preserve. i checked for the usual back-compat smells and found none:

- **no deprecated field re-exports** — the domain objects declare only the vision's fields; no
  legacy alias kept "to be safe".
- **no dual-path branches** — the set/get ops have one path each; no "if old-format else
  new-format" fork.
- **no optional shim params** — inputs follow the vision's nullability convention
  (readonly/metadata + writeonly `value` use `?`; roundtrip fields are required-nullable). no
  extra optional added for a hypothetical old caller.
- **no version-tolerant parse** — the cast reads current AWS SDK shapes only.

## adjacent surface i touched — did i keep old behavior?

- `src/access/sdks/sdkSsm/index.ts` — i ADDED `describeParameters`/`describeOneParameter`
  exports next to the extant `getOneParameter`/`setParameter`. i did not alter or wrap the
  extant wrappers, so no back-compat concern; the additions are purely additive.
- provider type-map + daos-map — additive entries; extant resource registrations untouched.
- sdk index exports — additive; no prior export renamed or re-aliased.

## the one place a reader might see "compat"

the `keyId` cast maps AWS's `alias/aws/ssm` (the default-key sentinel `DescribeParameters`
returns) to `null`. this is NOT back-compat — it is the vision's declared convention
(`keyId: null` = default key) so the declared value and the read-back value converge to KEEP.
it is drift-correctness, not legacy tolerance.

## conclusion

0 unrequested back-compat. the feature is new; every field and path serves the current vision,
none preserves a legacy shape.
