# self-review r8: role-standards-coverage

## rule directories verified

1. `practices/code.prod/evolvable.domain.objects/`
2. `practices/code.prod/evolvable.domain.operations/`
3. `practices/code.prod/evolvable.procedures/`
4. `practices/code.prod/pitofsuccess.errors/`
5. `practices/code.prod/pitofsuccess.typedefs/`
6. `practices/code.test/scope.coverage/`
7. `practices/code.test/frames.behavior/`

## coverage analysis by file

### DeclaredAwsVpcTunnel.ts

read file lines 1-117. verified line by line.

**question: is jsdoc complete?**

| field | jsdoc present | pattern | evidence |
|-------|---------------|---------|----------|
| account | yes | `.what = ` | line 54: "the aws account id whose credentials opened this tunnel" |
| region | yes | `.what = ` | line 59: "the aws region whose credentials opened this tunnel" |

why it holds: both fields follow extant pattern. all other fields in file have `.what = ` jsdoc (lines 7, 23, 38, 64, 69, 74, 79, 84).

**question: is type declaration complete?**

| field | type | optional | nullable |
|-------|------|----------|----------|
| account | string | no | no |
| region | string | no | no |

why it holds: both are required identity fields. line 56 and 61 declare `string` type without `?` or `| null`.

**question: is unique array complete and correct?**

line 94: `public static unique = ['account', 'region', 'via', 'into', 'from'] as const;`

| check | status | why |
|-------|--------|-----|
| account present | yes | first element |
| region present | yes | second element |
| order logical | yes | scope-first (account, region), then specifics (via, into, from) |
| as const | yes | ensures tuple type inference |

### getTunnelHash.ts

read file lines 1-35. verified line by line.

**question: is jsdoc header complete?**

| section | present | content |
|---------|---------|---------|
| .what | yes | line 7: "generates a deterministic hash for a tunnel configuration" |
| .why | yes | line 8: "enables consistent identification of tunnels across process restarts" |
| .note | yes | line 9: "includes account and region from input (part of unique ref)" |

why it holds: follows rule.require.what-why-headers with all three sections.

**question: does hash object match unique array?**

hash object (lines 18-24):
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

unique array: `['account', 'region', 'via', 'into', 'from']`

| field | in hash | in unique | aligned |
|-------|---------|-----------|---------|
| account | yes | yes | yes |
| region | yes | yes | yes |
| via | yes | yes | yes |
| into | yes | yes | yes |
| from | yes | yes | yes |
| _v | yes | no | ok (version marker, not identity) |

why it holds: all unique fields are in hash. _v is version marker, not identity field.

**question: is return type explicit?**

line 13: `}): string => {`

why it holds: explicit return type declared. follows rule.require.clear-contracts.

### castIntoDeclaredAwsVpcTunnel.ts

read file lines 1-28. verified line by line.

**question: does spread pass through new fields?**

line 21: `...input.unique,`

input type (line 15): `unique: RefByUnique<typeof DeclaredAwsVpcTunnel>`

RefByUnique now includes account and region (because DeclaredAwsVpcTunnel.unique includes them).

why it holds: spread operator passes all properties from unique ref. typescript enforces account and region are present because they're in unique array.

**question: is jsdoc header complete?**

| section | present | content |
|---------|---------|---------|
| .what | yes | line 11: "transforms tunnel unique ref + status into DeclaredAwsVpcTunnel" |
| .why | yes | line 12: "ensures type safety and readonly field enforcement" |

why it holds: follows rule.require.what-why-headers.

### castIntoDeclaredAwsVpcTunnel.test.ts

read file lines 1-51. verified line by line.

**question: are account and region tested explicitly?**

| assertion | line | code |
|-----------|------|------|
| account present | 26 | `expect(result.account).toBe('123456789012')` |
| region present | 30 | `expect(result.region).toBe('us-east-1')` |

why it holds: explicit assertions verify pass-through works.

**question: does fixture include both fields?**

lines 12-13:
```typescript
account: '123456789012',
region: 'us-east-1',
```

why it holds: fixture matches expected format (12-digit account, standard region).

### DeclaredAwsVpcTunnel.test.ts

read file lines 1-79. verified line by line.

**question: do fixtures include new fields?**

| given block | account | region | lines |
|-------------|---------|--------|-------|
| "valid account, region..." | yes | yes | 12-13 |
| "all properties provided..." | yes | yes | 44-45 |

**question: is unique array assertion updated?**

lines 64-71:
```typescript
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

why it holds: assertion verifies exact array contents.

### getTunnelHash.test.ts

verified diff. split tests are present.

**question: are differentiation tests present?**

| test | purpose | verifies |
|------|---------|----------|
| "same tunnel via/into/from with different account" | different account = different hash | root cause fix |
| "same tunnel via/into/from with different region" | different region = different hash | root cause fix |

why it holds: these tests directly verify the fix works — the original defect was that different accounts/regions produced same hash.

## gaps found

none. all required patterns are present.

## what holds (summary)

1. **jsdoc coverage** — all new fields have `.what =` comments
2. **type coverage** — required fields (not optional/nullable)
3. **unique coverage** — array includes account and region
4. **hash coverage** — object matches unique array
5. **test coverage** — explicit assertions for new fields
6. **differentiation coverage** — tests verify fix works

