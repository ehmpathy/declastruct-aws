# self-review r7: role-standards-adherance

## rule directories checked

1. `practices/code.prod/evolvable.domain.objects/`
2. `practices/code.prod/evolvable.domain.operations/`
3. `practices/code.prod/evolvable.procedures/`
4. `practices/code.prod/readable.comments/`
5. `practices/code.test/frames.behavior/`
6. `practices/lang.terms/`
7. `practices/lang.tones/`

## line-by-line verification

### DeclaredAwsVpcTunnel.ts

**lines 53-61: new fields**

```typescript
/**
 * .what = the aws account id whose credentials opened this tunnel
 */
account: string;

/**
 * .what = the aws region whose credentials opened this tunnel
 */
region: string;
```

| rule | line(s) | verdict |
|------|---------|---------|
| rule.forbid.undefined-attributes | 56, 61 | holds: `string` type, not `string?` or `string \| undefined` |
| rule.forbid.nullable-without-reason | 56, 61 | holds: no `null` type — these are identity fields, must be present |
| rule.require.what-why-headers | 53-55, 58-60 | holds: `.what = ` jsdoc present on both |
| rule.prefer.lowercase | 54, 59 | holds: "the aws account id..." starts lowercase |
| rule.require.ubiqlang | 56, 61 | holds: `account` and `region` match ContextAwsApi.aws.credentials pattern |

**line 94: unique array update**

```typescript
public static unique = ['account', 'region', 'via', 'into', 'from'] as const;
```

| rule | line | verdict |
|------|------|---------|
| rule.require.immutable-refs | 94 | holds: unique fields are identity — immutable by definition |
| rule.require.treestruct | 94 | holds: array order is scope-first (account, region) then specifics (via, into, from) |

### getTunnelHash.ts

**lines 6-10: jsdoc header**

```typescript
/**
 * .what = generates a deterministic hash for a tunnel configuration
 * .why = enables consistent identification of tunnels across process restarts
 * .note = includes account and region from input (part of unique ref)
 */
```

| rule | line(s) | verdict |
|------|---------|---------|
| rule.require.what-why-headers | 7-9 | holds: `.what`, `.why`, `.note` all present |
| rule.prefer.lowercase | 7-9 | holds: all start lowercase |

**lines 11-13: function signature**

```typescript
export const getTunnelHash = (input: {
  for: { tunnel: RefByUnique<typeof DeclaredAwsVpcTunnel> };
}): string => {
```

| rule | line(s) | verdict |
|------|---------|---------|
| rule.require.arrow-only | 11 | holds: uses `const fn = () =>` pattern |
| rule.require.input-context-pattern | 11-13 | holds: `(input)` only — context removed because account/region now in input |
| rule.forbid.positional-args | 11-13 | holds: named input object, not positional args |

**lines 18-24: hash object**

```typescript
{
  account: input.for.tunnel.account,
  region: input.for.tunnel.region,
  via: input.for.tunnel.via,
  into: input.for.tunnel.into,
  from: input.for.tunnel.from,
  _v: 'v2025_11_27',
}
```

| rule | line(s) | verdict |
|------|---------|---------|
| rule.require.immutable-vars | 15-27 | holds: no mutation, pure function |
| rule.forbid.inline-decode-friction | 18-24 | holds: property access is clear, no decode needed |

### castIntoDeclaredAwsVpcTunnel.test.ts

**lines 1-5: imports**

```typescript
import { given, then, when } from 'test-fns';
import { DeclaredAwsVpcTunnel } from '@src/domain.objects/DeclaredAwsVpcTunnel';
import { castIntoDeclaredAwsVpcTunnel } from './castIntoDeclaredAwsVpcTunnel';
```

| rule | line(s) | verdict |
|------|---------|---------|
| rule.require.given-when-then | 1 | holds: imports given/when/then from test-fns |

**lines 7-49: test structure**

```typescript
describe('castIntoDeclaredAwsVpcTunnel', () => {
  given('a unique ref with account and region', () => {
    when('cast into tunnel', () => {
      const result = castIntoDeclaredAwsVpcTunnel({...});
      then('account is present in output', () => {...});
      then('region is present in output', () => {...});
      ...
    });
  });
});
```

| rule | line(s) | verdict |
|------|---------|---------|
| rule.require.given-when-then | 8-48 | holds: given → when → then structure |
| rule.forbid.redundant-expensive-operations | 10-23, 25-47 | holds: single call in when block, result shared across then blocks |
| rule.forbid.gerunds | 8, 9, 25, 29, 33, 37 | holds: no -ing words in descriptions |

**lines 12-13: fixture values**

```typescript
account: '123456789012',
region: 'us-east-1',
```

| rule | line(s) | verdict |
|------|---------|---------|
| test fixture conventions | 12-13 | holds: 12-digit account, standard AWS region format |

### getTunnelHash.test.ts split tests

**lines 76-118: different account test** (from diff)

the "different credentials" test was split into:
- "same tunnel via/into/from with different account"
- "same tunnel via/into/from with different region"

| rule | verdict |
|------|---------|
| rule.forbid.gerunds | holds: no -ing words in descriptions |
| rule.require.given-when-then | holds: proper bdd structure |
| test clarity | improved: separate tests for separate behaviors |

## issues found and fixed

none in this review. all code adheres to mechanic standards.

## what holds (with evidence)

1. **domain object standards**
   - lines 53-61: `.what` jsdoc on both new fields
   - lines 56, 61: types are `string` (not optional/nullable)
   - line 94: unique array updated correctly

2. **operation standards**
   - line 11: arrow function syntax
   - lines 11-13: input-only pattern (context removed)
   - lines 6-10: full jsdoc header with .what/.why/.note

3. **test standards**
   - all test files import from test-fns
   - given/when/then structure verified
   - no redundant expensive calls

4. **name conventions**
   - checked all test descriptions for gerunds: none found
   - field names match extant patterns (account, region)

5. **comment standards**
   - all new code has required jsdoc
   - lowercase style matches codebase

