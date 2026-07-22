# self review r5 — behavior-declaration-adherance

## the core guarantee: verified line-by-line, SOLID

the feature's entire reason to exist is "secure plan issues NO GetParameter and NO
kms:Decrypt." i traced the full secure read path and it adheres exactly:

- `getOneSsmParameterSecure.ts:38` calls ONLY `describeOneParameter` — never `getOneParameter`.
- `describeOneParameter.ts:29-35` issues ONLY `DescribeParametersCommand` (metadata filter by
  Name) — no `GetParameterCommand`, no `WithDecryption`.
- `getOneSsmParameterSecure.ts:42` casts via `castIntoDeclaredAwsSsmParameterSecure`, which sets
  `value: undefined` (`cast...Secure.ts:31`).

so a secret is reconciled with metadata only; the value is never read or decrypted. this is
the vision's headline guarantee and the code honors it faithfully. the plain path adheres too:
`getOneSsmParameterPlain` reads via `getOneParameter({ withDecryption: false })` — value-compare
without decrypt, exactly as the vision's asymmetry prescribes.

## the real findings: defensive defaults that invent identity/readonly values

i read `describeOneParameter.ts` line by line and found three spots that deviate from
rule.require.failfast / rule.forbid.unexpected-defaults — each invents a value instead of a
loud failure:

1. **`arn: metadata.ARN ?? ''`** (`:44`) — `arn` is the PRIMARY key (`Secure.ts:68`,
   `Plain.ts:59`). if AWS ever omits `ARN`, this silently yields a domain object with an
   EMPTY-STRING primary key rather than a fail-loud. an empty primary key is a corrupt
   identity that would propagate into refs and diffs. it should
   `UnexpectedCodePathError.throw` when ARN is absent.
2. **`lastModifiedAt: ... ?? new Date()...`** (`:48-49`) — a `@readonly` field (aws-assigned).
   a "now" fallback when AWS omits it invents a readonly value, a mild failhide.
3. **`version: Number(metadata.Version ?? 0)`** (`:47`) — same shape; an invented version 0.

**severity: nitpick, and here is the honest why.** none of these fires against real AWS —
`DescribeParameters` always returns ARN, Version, and LastModifiedDate for an extant param, so
the `?? ` branches are dead in practice, and my green acceptance run (26 passed) exercises the
real path with real values. they are latent robustness smells, not live defects, and they do
NOT touch the security guarantee. i did NOT patch them mid-gate to avoid a ripple into
snapshots/tests, but i recommend the arn `?? ''` become a fail-loud (primary-key absence is
never acceptable) in a follow-up. flagged, not buried.

## one more adherence nuance i checked and cleared

`type: metadata.Type as '...'` (`:45`) is an `as` cast (rule.forbid.as-cast). it sits at the
raw AWS-SDK boundary (the documented exemption for `as`), and `type` is not surfaced onto the
domain object (Secure has no `type` field), so it is an internal wrapper-shape coercion, not a
domain-type escape hatch. holds — but a boundary comment would be tidier.

## write-only KEEP mechanism: adheres to github's model

the vision says github achieves KEEP by "leave value undefined in steady state" (NOT by an
engine-level writeonly strip). my cast returns `value: undefined`, and the acceptance run shows
the secure param converge to KEEP with value undefined — empirically the diff treats
undefined===undefined as KEEP and a supplied value as UPDATE. adheres.

## verdict

core security adherence is SOLID and verified line-by-line (no GetParameter, no decrypt, value
undefined). 3 nitpick-level defensive-default smells surfaced in `describeOneParameter`
(arn/version/lastModifiedAt `??` fallbacks invent identity/readonly values) — dead against
real AWS, recommended as a fail-loud follow-up for the arn primary key. no vision deviation in
the behavior itself.
