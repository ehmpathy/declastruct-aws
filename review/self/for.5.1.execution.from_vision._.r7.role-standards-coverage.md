# self review r7 — role-standards-coverage

## step 1 — rule directories enumerated

for coverage-of-standards the load-critical dirs are `code.test/*`
(test-coverage-by-grain, given-when-then, snapshots, forbid-mocks, failfast-in-tests) and
`code.prod/pitofsuccess.errors` (failfast paths must be exercised). also spot: `readable.*`
(what/why headers present), `code.prod/pitofsuccess.procedures` (idempotency proven).

## step 2 — the coverage gap i FOUND and FIXED

by grain (rule.require.test-coverage-by-grain), i mapped each op to its test and found the
transformers' fail-loud branches UNCOVERED:

- `asSsmParameterName.test.ts` + `asSsmParameterIdentifier.test.ts` each had only the 4
  happy-path cases (unique, primary, ref-unique, ref-primary). the
  `UnexpectedCodePathError.throw` branch (a `by` with no primary/unique/ref) had NO test —
  an untested failfast path, against the spirit of rule.require.failfast + the test-coverage
  rule.

**fix:** added `[case5]` to BOTH transformer tests — `getError(() => asX({ by: {} }))` +
`expect(error).toBeInstanceOf(UnexpectedCodePathError)`. this needs NO cast and NO mock: an
empty `by` is a legal `PickOne` shape that lands on the throw. proof:
`rhx git.repo.test --what unit --scope path://asSsmParameterName` → 5 passed;
`...asSsmParameterIdentifier` → 5 passed.

## step 3 — coverage that is PRESENT (verified, the headline included)

- **transformers → unit**: `as*` (now incl. error branch) + `cast*` (plain + secure) unit tests. ✅
- **orchestrators (get/set/del) → integration**: `ssmParameterPlain.journey` +
  `ssmParameterSecure.journey`. ✅
- **communicators (sdk wrappers) → integration**: exercised transitively by the journeys
  against real AWS (no dedicated sdkSsm integration file, but the journeys drive every wrapper
  end-to-end). ✅
- **contract (daos via declastruct) → acceptance + snapshots**: `declastruct.acceptance.test.ts`
  asserts plan-inclusion + post-apply KEEP for both params + the create-without-value
  BadRequestError, all snapped. ✅
- **THE headline guarantee is asserted, not just implemented**:
  `ssmParameterSecure.journey.integration.test.ts:69-78` spies `SSMClient.prototype.send` (a
  call-through spy, not a mock) and asserts NO `GetParameterCommand` is ever issued for the plan
  read. this is the strongest possible coverage of "no GetParameter, no decrypt at plan." ✅

## the one branch i left uncovered, and why it holds

the sdk-wrapper fail-loud branches i added earlier (aws omits ARN/Version/etc.) remain
untested: to exercise them needs a malformed AWS response, which a unit test cannot fabricate
without a mock (forbidden) and a real integration cannot force. they guard a can't-happen
provider contract; to leave them uncovered is defensible, unlike the transformer branch which
was trivially reachable with a legal input.

## verdict

1 coverage gap found and fixed: both transformers' failfast branch is now unit-tested (5 passed
each, no cast/mock). all grains covered, and the feature's headline no-GetParameter guarantee is
asserted via a call-through spy. the only uncovered branches are provider-contract-impossible
sdk fail-loud guards, left with cause.
