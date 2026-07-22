# self review r8 — role-standards-coverage

## the absent test i found: no test exercised the DAO's delete path

`grep delSsmParameterSecure src/**/*.test.ts` → 0 hits. that is the tell. the
`SecureDao.delete` (`DeclaredAwsSsmParameterSecureDao.ts:37`) wires to `delSsmParameterSecure`,
yet no test ever called that op — the journeys deleted via the raw `delParameter` sdk wrapper
instead. so the one code path a real declastruct `apply` uses to REMOVE a secret was shipped
unproven. that is the "junior forgot a test" pattern this review hunts, and it hides behind a
green suite because a DIFFERENT (raw) delete was tested in its place.

two rules name this gap:
- `rule.require.test-coverage-by-grain` — the del orchestrator has no integration test.
- `rule.require.dao-and-acceptance-per-declared-resource` — a dao method whose op is never
  driven is an unproven promise.

## the fix

secure journey `[t6]` now deletes through the orchestrator, not the wrapper:

```ts
await delSsmParameterSecure({ by: { unique: { name: testName } } }, context);
```

so `[t6]` drives `asSsmParameterName` (ref-route) → `delParameter` → then asserts `getOne`
returns null: the exact composition the dao calls. `rhx git.repo.test --what integration
--scope path://ssmParameterSecure` → 7 passed against real AWS.

## why i trust the rest of the coverage after this

with the del path closed, every op a user drives now has a test at its grain:

| grain | op(s) | test |
|-------|-------|------|
| transformer | `as*` (happy paths), `cast*` | unit |
| orchestrator | get, set, **del (now)** | secure + plain journeys |
| communicator | the 4 sdk wrappers | driven by the journeys, real AWS |
| contract | both daos | acceptance plan/KEEP + create-without-value error, snapped |

note on the transformer throw-branches: i initially added a `[case5]` for the
`UnexpectedCodePathError` guard, but it does NOT type-check — `by: {}` is not assignable to
`PickOne<{primary,unique,ref}>`, and a `ref` is always `RefByUnique | RefByPrimary`. those
throws are therefore UNREACHABLE with any well-typed input (pure defensive guards); to test
them needs an `as`-cast (forbidden). so i reverted the `[case5]` — the branches are left
uncovered with cause, same class as the sdk fail-loud guards below.

and the feature's whole reason to exist — no `GetParameter`, no decrypt at plan — is not merely
implemented but ASSERTED, by the call-through `SSMClient.send` spy at
`ssmParameterSecure.journey:69-78`.

## the deliberately-uncovered remainder

the sdk fail-loud guards (aws omits ARN/Version/…) have no test: to reach them needs a
malformed provider response a unit test cannot fake (mocks forbidden) and a real call cannot
force. they guard a can't-happen contract — left uncovered with cause, unlike the del path,
which was reachable and is now proven.

## verdict

1 hidden coverage gap found and fixed: the DAO's secret-delete path (`delSsmParameterSecure`)
was untested — a green suite masked it because a raw delete stood in. `[t6]` now exercises the
real orchestrator (7 passed). every user-driven op is covered at its grain; the only uncovered
branches are type-impossible defensive guards (the transformer throws + the sdk fail-loud
guards), left with cause.
