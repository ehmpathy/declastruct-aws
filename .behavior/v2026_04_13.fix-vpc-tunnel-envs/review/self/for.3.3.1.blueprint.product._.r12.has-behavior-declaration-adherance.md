# self-review r12: has-behavior-declaration-adherance

## deeper adherence verification

re-read the blueprint and the wish. verify each line against spec.

## the wish (exact text)

> we gotta fix this so we can create use.vpc.tunnel across different envs

> the root cause is in declastruct-aws — the DeclaredAwsVpcTunnel resource identity doesn't include stage-differentiation

user confirmation:
> diff ports, i confirmed
> explicit account; always explicit

## blueprint section: DeclaredAwsVpcTunnel.ts

### interface change

```
├── [+] account: string                    # AWS account ID
```

**spec**: explicit account field

**adherent?** yes. `account: string` is explicit. it's a required field, not optional.

**potential issue**: is `string` the right type?

**verification**: the user said "explicit account" — a string AWS account ID (e.g., "874711128849") is explicit. RefByPrimary would add indirection.

### unique change

```
├── [~] unique = ['account', 'via', 'into', 'from']  # add account
```

**spec**: resource identity must include account

**adherent?** yes. account is added to unique keys.

**potential issue**: should account be first?

**verification**: extant pattern shows scope-first (DeclaredAwsIamUser: `['account', 'username']`). blueprint follows.

## blueprint section: getTunnelHash.ts

### serialized object change

```
├── [~] account: input.for.tunnel.account   # from input, not context
```

**spec**: explicit account

**adherent?** yes. account comes from input (the tunnel's unique ref), not from context.

**potential issue**: is this backwards compatible?

**verification**: no — this is intentionally a break. the version bump handles cache invalidation.

### version change

```
└── [~] _v: 'v2026_04_13'                   # bump version
```

**spec** (implied): old caches invalid

**adherent?** yes. date format matches extant pattern.

## blueprint section: castIntoDeclaredAwsVpcTunnel.ts

```
├── [+] account: input.unique.account
```

**spec**: tunnel must have account

**adherent?** yes. cast function passes through account from unique ref.

## blueprint test coverage

| test | spec requirement | adherent? |
|------|-----------------|-----------|
| instantiation with account | required field | yes |
| unique includes account | identity differentiation | yes |
| same account = same hash | deterministic | yes |
| diff account = diff hash | account differentiates | yes |
| account in cast output | field present | yes |

## did the junior misinterpret?

### question: should region also be explicit?

**spec**: "explicit account; always explicit"

**blueprint**: keeps region from context

**analysis**: the wish said account was the root cause. region wasn't mentioned. the user showed dev vs prod accounts as the differentiator. region from context is correct — region didn't cause the collision.

### question: should we use RefByPrimary like DeclaredAwsIamUser?

**spec**: "explicit account"

**blueprint**: uses `string`

**analysis**: implementation note #4 explains this is a justified deviation. account is identity-differentiator, not relationship.

## issues found

none.

## what holds

blueprint correctly adheres to spec:
1. account field is explicit (string, not ref) ✓
2. account in unique for identity ✓
3. account in hash from input (not context) ✓
4. version bumped for cache invalidation ✓
5. region unchanged (was not the problem) ✓
6. all tests verify the requirements ✓
