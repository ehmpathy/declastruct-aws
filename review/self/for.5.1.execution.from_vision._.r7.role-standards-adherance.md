# self review r7 — role-standards-adherance

## step 1 — rule directories enumerated (confirm none missed)

the changed files are domain objects, domain operations (get/set/cast/del + transformers), sdk
wrappers, a dao, provider wiring, sdk-index export, and acceptance/integration tests. the
relevant `briefs/` subdirectories:

- `lang.terms` — get-set-gen-verbs, treestruct, ubiqlang, order.noun_adj
- `lang.tones` — lowercase, forbid.shouts, forbid.gerunds, forbid.buzzwords
- `code.prod/evolvable.procedures` — arrow-only, input-context, named-args, inline-io,
  single-responsibility, clear-contracts
- `code.prod/evolvable.domain.objects` — nullable-without-reason, undefined-attributes,
  immutable-refs
- `code.prod/evolvable.repo.structure` — forbid.barrel-exports, forbid.index-ts,
  directional-deps
- `code.prod/pitofsuccess.typedefs` — forbid.as-cast, shapefit
- `code.prod/pitofsuccess.errors` — forbid.failhide, require.failfast, prefer.helpful-error-wrap
- `code.prod/pitofsuccess.procedures` — forbid.undefined-inputs, forbid.unexpected-defaults,
  require.idempotent-procedures
- `code.prod/readable.*` — what-why-headers, narrative-flow, forbid.else-branches,
  named-transformers
- `code.test/*` — given-when-then, scope rules, forbid mocks (for the test files)

no category missed for this diff.

## step 2 — violations FOUND and FIXED (line by line)

i audited the two sdk wrappers i had not yet standards-checked (`getOneParameter`,
`setParameter` — both NEW in this pr per `git diff --stat main`). both broke
`rule.forbid.unexpected-defaults`, and one also broke `rule.forbid.as-cast`.

**`getOneParameter.ts`** — fabricated defaults + a bare `as`:
- `arn ?? ''` (empty PRIMARY key), `value ?? ''` (empty roundtrip → false drift for plain),
  `version ?? 0`, `lastModifiedDate ?? new Date()...` (invented readonly), and
  `Type as '...'` with no documented reason.
- **fix**: value / arn / version / lastModifiedDate → `UnexpectedCodePathError.throw` when aws
  omits them (name keeps `?? input.name`, a known-good default); the `as` now carries the
  boundary-justification comment `rule.forbid.as-cast` requires.

**`setParameter.ts`** — `version: Number(response.Version ?? 1)` invented version 1.
- **fix**: fail-loud `UnexpectedCodePathError.throw` when PutParameter omits Version.

proof: `rhx git.repo.test --what types` → passed (14s). every `?? default` branch was dead
against real AWS, so no test/snapshot churn — behavior only shifts on a malformed response,
from silent-corrupt to fail-loud.

## step 3 — spot-checks that hold

- `delParameter.ts` — try/catch allowlists `ParameterNotFound` (return) and re-throws all else:
  the CORRECT allowlisted catch per `rule.forbid.failhide`, not a failhide.
- **get/set/gen** verbs, **arrow-only**, **input-context**, **inline-io**, **what/why headers**
  on every op, one-object **`sdkSsm` index** (no barrel), **directional-deps** (daos import
  domain objects, ops import sdks) — all conform.
- **undefined-attributes**: only `@writeonly value` + `@metadata`/`@readonly` use `?`; roundtrip
  `keyId` is `string | null`. conforms.

## verdict

3 role-standards violations found and fixed (2 fabricated-default sites in `getOneParameter`,
1 in `setParameter`, plus the undocumented `as` now documented). combined with the earlier
`describeOneParameter` fail-loud fix, all three response-shaping sdk wrappers now fail loud on
an absent required field instead of a fabricated default. no remaining standards violation in
the diff.
