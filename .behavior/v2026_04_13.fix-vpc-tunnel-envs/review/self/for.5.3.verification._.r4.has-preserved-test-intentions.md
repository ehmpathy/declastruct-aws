# self-review: has-preserved-test-intentions (round 4)

## the question

for every test i touched: what did it verify before? does it verify the same behavior after?

## deep analysis by test file

### `DeclaredAwsVpcTunnel.test.ts` line 63-66

**before**:
```ts
then('unique is defined as via, into, from', () => {
  expect(DeclaredAwsVpcTunnel.unique).toEqual(['via', 'into', 'from']);
});
```

**after**:
```ts
then('unique is defined as account, region, via, into, from', () => {
  expect(DeclaredAwsVpcTunnel.unique).toEqual([
    'account',
    'region',
    'via',
    'into',
    'from',
  ]);
});
```

**intention**: verify domain object's identity fields

**analysis**: the old test verified `unique = ['via', 'into', 'from']`. the new test verifies `unique = ['account', 'region', 'via', 'into', 'from']`. this is NOT a weakened assertion — it's updated to match the new requirement.

the wish explicitly states the root cause was "DeclaredAwsVpcTunnel.unique doesn't include stage-specific fields". the fix adds those fields. the test now verifies the fix.

if i had weakened this test, it would look like:
```ts
expect(DeclaredAwsVpcTunnel.unique).toBeDefined(); // weakened!
```

but i didn't. the assertion is still exact array equality.

### `getTunnelHash.test.ts` line 79-117

**before**:
```ts
given('same tunnel with different credentials', () => {
  // ...
  hash1 = getTunnelHash({ for: { tunnel: tunnelRef } }, context1);
  hash2 = getTunnelHash({ for: { tunnel: tunnelRef } }, context2);
  // ...
  expect(hash1).not.toBe(hash2);
});
```

**after**:
```ts
given('same tunnel via/into/from with different account', () => {
  // ...
  hash1 = getTunnelHash({ for: { tunnel: { account: '111', ... } } });
  hash2 = getTunnelHash({ for: { tunnel: { account: '222', ... } } });
  // ...
  expect(hash1).not.toBe(hash2);
});

given('same tunnel via/into/from with different region', () => {
  // ...
  hash1 = getTunnelHash({ for: { tunnel: { region: 'us-east-1', ... } } });
  hash2 = getTunnelHash({ for: { tunnel: { region: 'us-west-2', ... } } });
  // ...
  expect(hash1).not.toBe(hash2);
});
```

**intention**: verify different accounts and regions produce different hashes

**analysis**: the old test verified that different context credentials produce different hashes. the new tests verify the SAME behavior — but now credentials come from input, not context.

the function signature changed from `(input, context)` to `(input)` because account/region are now explicit on the tunnel ref. the test was updated to match the new API, not to weaken the verification.

split into two tests makes intention clearer: one for account, one for region.

### `setVpcTunnel.test.ts` empty test removed

**before**:
```ts
given('a tunnel with OPEN status desired', () => {
  when('bastion is not found', () => {
    then('it should throw BadRequestError', async () => {
      // empty placeholder
    });
  });
});
```

**after**: (removed, replaced with comment)
```ts
// note: OPEN status tests require integration tests with real AWS SSM
```

**intention**: the empty placeholder had NO intention — it contained no assertions.

**analysis**: an empty `then()` block is a failhide pattern. it passes without verification. the peer review correctly flagged this. deletion is correct — there was no test to preserve.

the comment clarifies the scope boundary: unit tests cover CLOSED path, integration tests cover OPEN path.

## summary

| test | before intention | after intention | preserved? |
|------|------------------|-----------------|------------|
| unique keys | verify exact array | verify exact array (new values) | ✓ |
| hash differentiation | different context → different hash | different input → different hash | ✓ |
| empty placeholder | none (failhide) | n/a (removed) | n/a |

## conclusion

✓ no intentions weakened
✓ assertions updated to match new API, not to make tests pass
✓ empty failhide test correctly removed
✓ requirements change documented in wish/vision
