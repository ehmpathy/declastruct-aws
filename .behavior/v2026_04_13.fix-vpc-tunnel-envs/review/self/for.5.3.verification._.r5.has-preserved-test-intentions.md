# self-review: has-preserved-test-intentions (round 5)

## pause and reflect

the system asks: what is the rush? what does haste cost?

i've been in a mode that treats this review as a gate to pass. that is wrong. the review IS the work. let me slow down and truly examine.

## the deeper question

the guide asks about "forbidden" patterns:
- weaken assertions to make tests pass
- remove test cases that "no longer apply"
- change expected values to match broken output
- delete tests that fail instead of fix code

did i do any of these? let me look with fresh eyes.

## re-examination of `DeclaredAwsVpcTunnel.test.ts:63-66`

the old assertion:
```ts
expect(DeclaredAwsVpcTunnel.unique).toEqual(['via', 'into', 'from']);
```

the new assertion:
```ts
expect(DeclaredAwsVpcTunnel.unique).toEqual(['account', 'region', 'via', 'into', 'from']);
```

**pause**: this IS a changed expected value. i need to examine why.

the old test said: "identity is defined by via, into, from"

the new test says: "identity is defined by account, region, via, into, from"

**is this a weakened assertion?** no — it's a strengthened one. the identity now includes MORE fields.

**is this "change expected values to match broken output"?** no — the code was intentionally changed to include account and region. the test verifies the new intended behavior.

**how do i know the change was intentional, not accidental?**
- the wish explicitly says: "the root cause is in declastruct-aws — the DeclaredAwsVpcTunnel resource identity doesn't include stage-specific"
- the vision says: "add account and region to unique keys"
- the blueprint says: "add `account` and `region` to `DeclaredAwsVpcTunnel.unique`"

this is a documented requirement change, not a test fix to hide a bug.

## re-examination of empty test removal

the old code:
```ts
given('a tunnel with OPEN status desired', () => {
  when('bastion is not found', () => {
    then('it should throw BadRequestError', async () => {
      // empty
    });
  });
});
```

**is this "delete tests that fail instead of fix code"?**

pause. let me think about this carefully.

the test had NO assertions. it could not fail. it was not a test — it was a placeholder. a placeholder that always passes is worse than no test at all because it creates false confidence.

the peer review explicitly flagged this as failhide:
> "empty test placeholder flagged as failhide"

the correct action is removal. this is not "delete a failed test" — this test never verified any behavior.

## re-examination of `getTunnelHash.test.ts`

the function signature changed from `(input, context)` to `(input)`.

**is an update of tests for a signature change "weakened assertion"?**

no. the tests still verify the same behavior: different account → different hash. different region → different hash.

the mechanism changed (from context injection to explicit input), but the verified behavior is identical.

## the deepest question

have i been too quick to dismiss these as "not weakened"?

let me steelman the concern: maybe i SHOULD have kept the old assertion and made the code match it?

answer: no. the wish explicitly requests account and region in identity. the old assertion represented the OLD (broken) behavior. to keep the old assertion would mean not to fix the bug.

## conclusion

✓ assertions changed to match NEW requirements, not to hide bugs
✓ requirements documented in wish/vision/blueprint
✓ empty failhide test correctly removed — it was not a test
✓ function signature change required test updates — behavior unchanged

i am not in rush mode. i have examined each change with care. the changes preserve the spirit of verification while they update for new requirements.
