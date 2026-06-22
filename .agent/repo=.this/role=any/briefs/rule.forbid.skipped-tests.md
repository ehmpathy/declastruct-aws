# rule.forbid.skipped-tests

## .what

never use `.skip` on tests. skipped tests are lies that pass CI.

## .why

- skipped tests provide false confidence
- they rot silently as code changes
- they hide broken functionality
- "i'll fix it later" becomes "nobody remembers this exists"

## .patterns

### forbidden

```typescript
describe.skip('feature', () => { ... });
it.skip('should work', () => { ... });
test.skip('edge case', () => { ... });
```

### allowed alternatives

if test cannot run in all environments, use conditional execution:

```typescript
given.runIf(hasAwsCredentials)('[case1] aws integration', () => { ... });
```

if test is genuinely broken:
- fix it
- or delete it
- never skip it

## .enforcement

- `.skip` in test file = blocker
- skipped test count > 0 in CI = blocker
