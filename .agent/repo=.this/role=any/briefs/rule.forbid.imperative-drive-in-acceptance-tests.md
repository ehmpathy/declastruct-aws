# rule.forbid.imperative-drive-in-acceptance-tests

## .what

## severity: blocker

in an acceptance test (`*.acceptance.test.ts`), the **resource-under-test's asserted
lifecycle** — the create / update / delete that the test's assertion is ABOUT — must be
driven through the declarative `declastruct plan`/`apply` CLI. it must NEVER be driven by an
imperative `setX` / `delX` domain-op or a raw SDK call. the whole point of an acceptance test
here is to dogfood the declarative contract a user takes; to drive the asserted change
imperatively is to test a path no user uses.

imperative ops (`setParameter`, `delParameter`, `setSsmParameterSecure`, raw SDK) are allowed
in an acceptance test ONLY for the two phases that are NOT the thing under test:

1. **arrange** — seed a PRECONDITION state that the declarative action then reconciles FROM
   (e.g. seed an OLD value so `declastruct plan` reports UPDATE; seed a SecureString at a name
   so the type-confusion guard fires). the wish under test cannot establish its own "before".
2. **teardown** — cleanup in `afterAll`/`beforeAll` (idempotent `delX`), which has no bearing
   on the assertion.

## .why

- this repo IS a declarative provisioner; the acceptance suite is its shop window. if the
  ACTION under test is an imperative `setParameter`, the test proves the imperative path works
  and proves none of `declastruct plan`/`apply` — the exact path we ship.
- the declarative CLI carries plan/apply, drift detection, idempotency, apply-order, and the
  DAO wiring. an imperative drive bypasses ALL of it, so a green test can hide a broken
  contract (the DAO unregistered, the plan mis-serialized, the apply mis-ordered).
- it mirrors, at the TEST grain, the same discipline
  `rule.require.declarative-in-skills-and-contracts` +
  `rule.forbid.imperative-in-skills-and-contracts` already demand of skills and public
  contracts, and the `rule.require.acceptance.blackbox` action-phase rule.

## .the boundary — WHICH phase is the op in?

| phase | imperative op allowed? | why |
|-------|------------------------|-----|
| **arrange** (`useBeforeAll` / `beforeAll`) — seed the precondition | ✅ yes | it is the "before" the wish reconciles from; the wish cannot seed its own prior state |
| **action** (the thing the `then` asserts) — the create/update/delete under test | ⛔ NO — must be `declastruct plan`/`apply` | this IS the declarative contract we ship; drive it any other way and the test is a lie |
| **verify** (`then`) — read back to confirm | ✅ yes (read-only get) | observation, not drive |
| **teardown** (`afterAll`) — cleanup | ✅ yes (idempotent `delX`) | no bearing on the assertion |

## .the test

for each imperative `setX`/`delX`/raw-SDK call in an acceptance test, ask:

> "is the assertion ABOUT the change this call makes?"

- **yes** → the call IS the action under test → forbid; drive it via `declastruct` instead.
- **no** (it seeds a precondition, or tears down, or reads back) → allowed.

## .examples

### 👍 allowed — imperative arrange + teardown, declarative action

```ts
when('a secret value is rotated and a plain value is changed', () => {
  const outcome = useBeforeAll(async () => {
    // ARRANGE: seed OLD values so the wish plans UPDATE (imperative — the "before")
    await setSsmParameterSecure({ upsert: { name, value: 'rotate-old-secret', ... } }, ctx);
    await setParameter({ name: plainName, value: 'rotate-old-plain', ... }, ctx);

    // ACTION: the asserted change goes through the REAL declastruct CLI
    execSync(`npx declastruct plan  --wish ${rotateResourcesFile} --into ${planFile}`);
    const apply = execDeclastructCapture(`npx declastruct apply --plan ${planFile}`);
    return { apply };
  });

  then('apply succeeds — the value rotate is written', () => {
    expect(outcome.apply.failed).toBe(false); // asserts the DECLARATIVE result
  });

  afterAll(async () => {
    await delParameter({ name: secureName }, ctx); // TEARDOWN — fine
  });
});
```

### 👎 forbidden — the asserted change driven imperatively

```ts
then('the secret is rotated', async () => {
  // the assertion is ABOUT this write, yet it bypasses declastruct entirely
  const after = await setSsmParameterSecure({ upsert: { name, value: 'new' } }, ctx);
  expect(after.version).toBeGreaterThan(before.version); // proves the imperative path, not the contract
});
```

## .where

- `src/contract/**/*.acceptance.test.ts` (and any `*.acceptance.test.ts`)

## .enforcement

- an imperative `setX`/`delX`/raw-SDK call whose effect is the SUBJECT of the assertion = blocker
- imperative arrange of a precondition the declarative action reconciles from = allowed
- imperative teardown / read-back verify = allowed

## .see also

- `rule.require.declarative-in-skills-and-contracts` — the same discipline for skills + contracts
- `rule.forbid.imperative-in-skills-and-contracts` — its forbid twin (exempts cleanup/teardown)
- `rule.require.acceptance.blackbox` (mechanic) — action via contract; setup/verify may use internals
- `rule.require.declarative-test-infra` — provision test INFRA declaratively too
- `rule.require.dao-and-acceptance-per-declared-resource` — the DAO the declarative action drives
