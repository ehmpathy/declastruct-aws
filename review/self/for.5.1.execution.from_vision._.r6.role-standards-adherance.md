# self review r6 — role-standards-adherance

## rule categories i checked (enumerated first)

`lang.terms` (get/set/gen, treestruct, ubiqlang), `lang.tones` (lowercase, no shouts/gerunds),
`code.prod/evolvable.procedures` (arrow-only, input-context, inline io, single-responsibility),
`code.prod/evolvable.repo.structure` (no barrel/index), `code.prod/pitofsuccess.typedefs`
(forbid as-cast, shapefit), `code.prod/pitofsuccess.errors` (failfast/failhide),
`code.prod/pitofsuccess.procedures` (undefined-inputs, unexpected-defaults),
`code.prod/readable.*` (what/why headers, narrative-flow, named-transformers),
`code.prod/evolvable.domain.objects` (nullable-without-reason, undefined-attributes).

## the violation i FOUND and FIXED

`rule.forbid.as-cast`: allowed ONLY at an external boundary AND only with a documented inline
comment. `describeOneParameter.ts:68` had `metadata.Type as 'String' | 'StringList' |
'SecureString'` with NO documented comment — a bare `as` that trips the rule.

fixed: added the required boundary comment that states WHY the cast is safe — the aws sdk types
`ParameterMetadata.Type` as its open `ParameterType` string enum, and we narrow it to our
closed union at the sdk boundary; aws only ever returns one of the three for a real parameter.
now it is a documented boundary exemption, not a bare escape hatch.

## the other candidate `as` sites — checked, all clean

- `castIntoDeclaredAwsSsmParameterSecure` / `...Plain` use `assure(...)` + `hasReadonly(...)`,
  NOT `as`. no escape hatch.
- no `as` in any of the get/set/del ops or the domain objects.

## standards that hold (spot-checked, not assumed)

- **get/set/gen**: `getOne*` / `set*` / `del*` + `as*` transformers + `cast*` — the canonical
  verbs, one op per file, filename === op name.
- **arrow-only + input-context**: every op is an arrow via `asProcedure(async (input, context)
  => ...)`. no `function` keyword.
- **inline io**: input/output shapes declared inline; no `*Input`/`*Output` domain objects.
- **failfast**: the three fabricated-default sites in `describeOneParameter` were already
  swapped to `UnexpectedCodePathError.throw` (prior pass); create-without-value throws
  `BadRequestError`.
- **no index/barrel**: `sdkSsm/index.ts` exports ONE object (`sdkSsm`), the permitted dao-style
  index — no re-export forward.
- **undefined-attributes**: only `@writeonly value` and `@metadata`/`@readonly` fields use `?`;
  roundtrip `keyId` is required-nullable `string | null`. conforms.
- **lowercase / no-shouts**: comments lowercase; acronyms (arn, kms, ssm) lowercase in prose.

## proof

types must stay green after the comment-only + boundary-doc change — verified next by
`rhx git.repo.test --what types` (comment addition, no logic change).

## verdict

1 role-standards violation found and fixed: an undocumented `as` cast at the sdk boundary now
carries the `rule.forbid.as-cast`-required justification comment. all other mechanic standards
(verbs, arrow-only, inline-io, failfast, no-barrel, nullability, tone) hold across the changed
files.
