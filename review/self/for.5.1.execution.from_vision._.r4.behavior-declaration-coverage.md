# self review r4 — behavior-declaration-coverage

## method

i took the "a junior may have skipped a requirement" prompt seriously and audited every vision
requirement against a concrete code location, opened line by line. the map is below; each row
is a grounded citation, not a claim.

## requirement → code map (every row verified)

| vision requirement | code location (verified) | status |
|--------------------|--------------------------|--------|
| req1: `DeclaredAwsSsmParameterPlain` (String) | `domain.objects/DeclaredAwsSsmParameterPlain.ts` | ✅ |
| req1: `DeclaredAwsSsmParameterSecure` (SecureString) | `domain.objects/DeclaredAwsSsmParameterSecure.ts` | ✅ |
| get/set/cast ops per resource | `ssmParameterPlain/*`, `ssmParameterSecure/*` | ✅ |
| dao per resource | `DeclaredAwsSsmParameterPlainDao.ts`, `...SecureDao.ts` | ✅ |
| provider registration (daos map) | `getDeclastructAwsProvider.ts:152-153` (+ imports :35-36) | ✅ |
| sdk export | `contract/sdks/index.ts` (Grep confirms) | ✅ |
| acceptance declared + asserted | `resources.acceptance.ts` + `declastruct.acceptance.test.ts` | ✅ |
| req2: secure plan has NO GetParameter / NO decrypt | `getOneSsmParameterSecure` → `describeOneParameter` (DescribeParameters, metadata only) | ✅ |
| write-only: `static writeonly = ['value']` | `DeclaredAwsSsmParameterSecure.ts:83` | ✅ |
| write-only: cast returns `value: undefined` | `castIntoDeclaredAwsSsmParameterSecure.ts:31` | ✅ |
| write-only: findsert no-op guard | `setSsmParameterSecure.ts:51` | ✅ |
| write-only: create-without-value throws | `setSsmParameterSecure.ts:54` | ✅ |
| plain value-compare via GetParameter (no decrypt) | `getOneSsmParameterPlain` → `getOneParameter({ withDecryption: false })` | ✅ |
| keyId default-key `alias/aws/ssm` → null | `castIntoDeclaredAwsSsmParameterSecure.ts:23` | ✅ |
| identity: primary=[arn], unique=[name], metadata=[arn], readonly=[version,lastModifiedAt] | `DeclaredAwsSsmParameterSecure.ts:68,73,78,88` | ✅ |

## the deliberate NON-features (confirmed absent by design, not by omission)

a junior might "forget" these; i confirmed each is INTENTIONALLY absent per an explicit vision
[answered]:

- **tier** — omitted from v1; not on either domain object. ✅ matches vision.
- **StringList** — only String + SecureString; no third type. ✅ matches vision.
- **hash / salt / HMAC** — grep for hash in the ssm ops → none; pure write-only, no
  secret-derived artifact. ✅ matches the vision's core decision.

## the one requirement RELAXED on purpose (flagged, not skipped)

the wish line "tell whether a write is required" is RELAXED for secrets — plan cannot diff the
value (write-only). this is the vision's explicit, wisher-confirmed tradeoff (replicate
github). i confirm the code honors the relaxation correctly: create-vs-keep works, a supplied
`value` signals the write. NOT a coverage gap — a documented design decision.

## gaps found

none. every vision requirement maps to a verified code location; every deliberate
non-feature is confirmed absent by design; the single relaxed requirement is the vision's
own tradeoff, honored faithfully.

## verdict

0 skipped requirements. the junior (me) left no part of the spec unimplemented; the write-only
mechanics, no-GetParameter-at-plan guarantee, provider registration, sdk export, and acceptance
coverage are all present and cited.
