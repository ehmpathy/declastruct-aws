# self-review r9: has-consistent-conventions

## deeper codebase search

searched all `public static unique` declarations in domain.objects.

### unique key patterns found

| domain object | unique keys | pattern |
|---------------|-------------|---------|
| DeclaredAwsIamUser | `['account', 'username']` | scope first, then identifier |
| DeclaredAwsSsoPermissionSet | `['instance', 'name']` | scope first, then identifier |
| DeclaredAwsSsoUser | `['instance', 'userName']` | scope first, then identifier |
| DeclaredAwsIamRolePolicyAttachedManaged | `['role', 'policy']` | parent first, then child |
| DeclaredAwsLambdaAlias | `['lambda', 'name']` | parent first, then child |
| DeclaredAwsIamPolicy | `['name', 'path']` | identifier, then qualifier |
| DeclaredAwsLambda | `['name']` | single identifier |
| DeclaredAwsLogGroup | `['name']` | single identifier |

**pattern observed**: when there's a scope/container, it comes first:
- `account` before `username`
- `instance` before `name`
- `role` before `policy`
- `lambda` before `name`

### blueprint consistency check

| aspect | extant pattern | blueprint | consistent? |
|--------|----------------|-----------|-------------|
| scope position | scope first | `['account', ...]` | yes |
| via/into/from | same as extant | preserved | yes |
| array format | `['x', 'y'] as const` | same | yes |

**holds**: `['account', 'via', 'into', 'from']` follows the "scope first" pattern.

### field type conventions

searched for field types in domain objects:

| field pattern | type used | examples |
|---------------|-----------|----------|
| AWS account ID | RefByPrimary | DeclaredAwsIamUser.account |
| AWS account ID | string (implicit) | DeclaredAwsSsoInstance.ownerAccount |

**observation**: ownerAccount in DeclaredAwsSsoInstance uses a different pattern. let me check it.

checked DeclaredAwsSsoInstance:
```ts
ownerAccount: RefByPrimary<typeof DeclaredAwsOrganizationAccount>;
public static unique = ['ownerAccount'] as const;
```

so both `account` and `ownerAccount` use RefByPrimary in other domain objects.

**but**: our blueprint uses `account: string` instead of RefByPrimary.

**question**: is this a convention violation?

**analysis** (from r8 mechanisms review):
- DeclaredAwsIamUser: user EXISTS IN account (relationship)
- DeclaredAwsVpcTunnel: tunnel uses credentials FROM account (identity)

DeclaredAwsSsoInstance's `ownerAccount` is also a relationship — the instance belongs to an account.

DeclaredAwsVpcTunnel's `account` is identity — which credentials were used. the tunnel doesn't "belong to" the account.

**decision**: string type is appropriate for identity-as-differentiator vs RefByPrimary for relationships.

**recommendation**: document this distinction in blueprint implementation notes.

### structure conventions

| aspect | extant | blueprint | match? |
|--------|--------|-----------|--------|
| interface before class | yes | yes | yes |
| static primary | optional | no (tunnel has no AWS id) | consistent |
| static unique | after primary | yes | yes |
| static metadata | after unique | yes | yes |
| static readonly | after metadata | yes | yes |
| static nested | last | yes | yes |

**holds**: blueprint follows extant class structure order.

## action item

add implementation note to blueprint about `account: string` vs RefByPrimary:

> **note on account type**: uses `string` (AWS account ID) instead of `RefByPrimary<DeclaredAwsOrganizationAccount>` because account is an identity differentiator for the tunnel, not a relationship. the tunnel doesn't "belong to" an account — it uses credentials from an account.

## summary

| check | result |
|-------|--------|
| unique key position | consistent (scope first) |
| unique key format | consistent |
| field type | justified deviation (documented) |
| class structure | consistent |
| file names | consistent |
| function names | consistent |

## what holds

all conventions are consistent with codebase patterns:
1. `account` first in unique follows "scope first" pattern
2. string type for account is justified (identity vs relationship)
3. class structure matches extant order
4. all names follow extant conventions

## issues found and fixed

**issue**: account type deviation not documented in blueprint.

**fix applied**: updated blueprint implementation notes to add note #4 about account type:
```
4. **account type**: uses `string` (AWS account ID) instead of `RefByPrimary<DeclaredAwsOrganizationAccount>`
   - reason: account is an identity differentiator, not a relationship
   - the tunnel doesn't "belong to" an account — it uses credentials from an account
   - other domain objects use RefByPrimary when the resource EXISTS IN the account (relationship)
   - tunnel uses account for identity comparison only
```

**verification**: blueprint now documents the justified deviation from RefByPrimary pattern.

no remaining issues.
