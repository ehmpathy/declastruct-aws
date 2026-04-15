# self-review r8: has-consistent-mechanisms

## codebase search for related patterns

searched codebase for extant account patterns.

### found: DeclaredAwsIamUser uses account in unique

```ts
// DeclaredAwsIamUser.ts line 32
account: RefByPrimary<typeof DeclaredAwsOrganizationAccount>;

// DeclaredAwsIamUser.ts line 65
public static unique = ['account', 'username'] as const;
```

**observation**: DeclaredAwsIamUser uses `RefByPrimary<typeof DeclaredAwsOrganizationAccount>` instead of raw `string`.

### pattern comparison

| domain object | account type | reason |
|---------------|--------------|--------|
| DeclaredAwsIamUser | RefByPrimary<DeclaredAwsOrganizationAccount> | user belongs to account (relationship) |
| DeclaredAwsVpcTunnel (blueprint) | string | account is identity differentiator |

**question**: should we use RefByPrimary instead of string?

**analysis**:
- IAM User: the user EXISTS WITHIN the account. account is a relationship.
- VPC Tunnel: the tunnel USES credentials from the account. account is identity.

for IAM User, you might want to query "all users in account X" — relationship matters.
for VPC Tunnel, you just need to know "which account's credentials opened this tunnel" — string is sufficient.

**decision**: string is appropriate for VPC Tunnel because:
1. tunnel doesn't "belong to" account the way user does
2. we don't need DeclaredAwsOrganizationAccount metadata
3. we just need the account ID for identity comparison

### verified: no duplicate mechanisms

| check | result |
|-------|--------|
| extant account field in DeclaredAwsVpcTunnel | none — we add it |
| extant hash function for tunnels | getTunnelHash — we modify it |
| extant cast function for tunnel | castIntoDeclaredAwsVpcTunnel — we modify it |
| duplicate utilities | none — we reuse hash-fns |

### verified: pattern consistency

| pattern | extant | blueprint | match? |
|---------|--------|-----------|--------|
| unique keys array | `['via', 'into', 'from']` | `['account', 'via', 'into', 'from']` | yes (extends extant) |
| hash serialization | serialize + toHashSha256Sync | same | yes |
| cast pass-through | maps input to output | same | yes |

### noted deviation

| aspect | extant pattern | blueprint | justified? |
|--------|----------------|-----------|------------|
| account type | RefByPrimary (in IAM User) | string | yes — different relationship |

**justification**: IAM User's account is a relationship (user belongs to account). VPC Tunnel's account is identity (which credentials). Different semantics warrant different types.

## summary

| check | result |
|-------|--------|
| searched codebase | yes — found extant account patterns |
| new mechanisms | none — all changes modify extant |
| duplicated functionality | none |
| pattern consistency | yes — with justified deviation |
| reused utilities | yes — hash-fns |

## what holds

1. blueprint modifies extant components, creates no new mechanisms
2. string type for account is justified (identity vs relationship)
3. extant patterns are followed
4. extant utilities are reused

## issues found

none. deviation from RefByPrimary pattern is justified and documented.
