# self-review r6: behavior-declaration-adherance

## adherence check

walked through each changed file in `git diff HEAD -- src/` and verified against behavior declaration.

### DeclaredAwsVpcTunnel.ts

**blueprint says**:
- add `account: string` field
- add `region: string` field
- update unique to `['account', 'region', 'via', 'into', 'from']`

**implementation**:
```typescript
// line 56
account: string;

// line 61
region: string;

// line 94
public static unique = ['account', 'region', 'via', 'into', 'from'] as const;
```

**verdict**: matches blueprint exactly.

### DeclaredAwsVpcTunnel.test.ts

**blueprint says**:
- add account + region to instantiation tests
- update unique keys assertion

**implementation**:
- given blocks updated to mention account + region
- fixtures contain `account: '123456789012'` and `region: 'us-east-1'`
- unique assertion: `['account', 'region', 'via', 'into', 'from']`

**verdict**: matches blueprint.

### getTunnelHash.ts

**blueprint says**:
- use `input.for.tunnel.account` instead of `context.aws.credentials.account`
- use `input.for.tunnel.region` instead of `context.aws.credentials.region`
- keep `_v: 'v2025_11_27'`

**implementation**:
```typescript
// lines 19-24
account: input.for.tunnel.account,
region: input.for.tunnel.region,
via: input.for.tunnel.via,
into: input.for.tunnel.into,
from: input.for.tunnel.from,
_v: 'v2025_11_27',
```

**verdict**: matches blueprint exactly.

### getTunnelHash.test.ts

**blueprint says**:
- add account + region to fixtures
- update "different credentials" test to use different account/region in input

**implementation**:
- all tunnelRef fixtures contain account + region
- context param removed from getTunnelHash calls
- "different credentials" split into "different account" and "different region" tests

**verdict**: matches blueprint. split test improves clarity.

### castIntoDeclaredAwsVpcTunnel.ts

**blueprint says**:
- pass through account + region via spread

**implementation**:
```typescript
// line 21
...input.unique,
```

**verdict**: matches blueprint. spread handles account + region automatically since they're part of unique.

### castIntoDeclaredAwsVpcTunnel.test.ts

**blueprint says**:
- create test for account + region pass-through

**implementation**:
- new test file created
- verifies `result.account === '123456789012'`
- verifies `result.region === 'us-east-1'`
- verifies result is DeclaredAwsVpcTunnel instance

**verdict**: matches blueprint.

### getVpcTunnel.ts and setVpcTunnel.ts

**blueprint says**:
- (implied) callers of getTunnelHash updated

**implementation**:
- getTunnelHash calls updated: removed context argument
- input.by.unique now contains account + region (type enforced)

**verdict**: matches implied requirement.

### getVpcTunnel.test.ts and setVpcTunnel.test.ts

**blueprint says**:
- (implied) test fixtures updated

**implementation**:
- all tunnelRef objects contain account + region
- getTunnelHash calls updated to remove context

**verdict**: matches implied requirement.

## deviations found

none. all implementations match the behavior declaration.

## what holds

1. **field additions** — account and region added exactly as specified
2. **unique update** — order and contents match blueprint
3. **hash change** — input fields used instead of context, version unchanged
4. **spread pass-through** — no explicit code needed, spread handles it
5. **test coverage** — all new test file created, all extant tests updated
6. **caller updates** — getVpcTunnel and setVpcTunnel tests properly updated

## additional verification

### field order in unique array

blueprint specifies: `['account', 'region', 'via', 'into', 'from']`

this order places scope identifiers (account, region) before tunnel-specific identifiers (via, into, from). this logical placement matches extant patterns in codebase (e.g., DeclaredAwsIamUser uses `['account', 'username']`).

### hash field alignment

hash object contains all unique fields plus version:
- account, region, via, into, from (from unique)
- _v (version marker)

this alignment ensures hash and unique stay synchronized as specified in vision.

