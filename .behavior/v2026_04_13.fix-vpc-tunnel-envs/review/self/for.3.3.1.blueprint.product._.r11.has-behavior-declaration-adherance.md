# self-review r11: has-behavior-declaration-adherance

## review direction

adherence review: does the blueprint correctly match what was specified? (vs coverage review: are all items present?)

## wish specification

> the root cause is in declastruct-aws — the DeclaredAwsVpcTunnel resource identity doesn't include stage-differentiation

the user chose explicit account field approach (not implicit via context).

## blueprint line-by-line adherence check

### line: `account: string`

**spec**: "explicit account; always explicit" (user choice)

**blueprint**: uses `string` type, not RefByPrimary

**adherent?** yes. the user wanted explicit account, and string is more explicit than a reference type. see implementation note #4 for justification.

### line: `unique = ['account', 'via', 'into', 'from']`

**spec**: resource identity must include account

**blueprint**: account is first in unique array

**adherent?** yes. account first follows scope-first pattern (matches DeclaredAwsIamUser). the spec didn't specify position, but we follow extant conventions.

### line: `account: input.for.tunnel.account` in getTunnelHash

**spec**: explicit account (not from context)

**blueprint**: gets account from input, not context.aws.credentials.account

**adherent?** yes. matches "always explicit" choice. the blueprint correctly removes context dependency for account.

### line: `_v: 'v2026_04_13'`

**spec** (implied): old caches must be invalidated

**blueprint**: bumps version from `'v2025_11_27'` to `'v2026_04_13'`

**adherent?** yes. version bump ensures old cache files (without account in hash) won't be reused.

### line: `region: context.aws.credentials.region` (unchanged)

**spec**: only account needed for differentiation

**blueprint**: keeps region from context

**adherent?** yes. implementation note #2 explains: "region is implicit in AWS credentials" — it doesn't differentiate tunnels the way account does. region is still ambient context.

### line: break documented in implementation notes

**spec** (implied): consumers must update

**blueprint**: "all consumers must update to pass `account`"

**adherent?** yes. break is explicit.

## deviations found

### account type: string vs RefByPrimary

the blueprint uses `account: string` while DeclaredAwsIamUser uses `account: RefByPrimary<DeclaredAwsOrganizationAccount>`.

**is this a deviation from spec?** no. the spec was "explicit account; always explicit" — string is more explicit than reference type. blueprint includes justification in implementation note #4.

## issues found

none. blueprint adheres to spec.

## what holds

blueprint correctly implements the spec:
1. explicit account field (not context) ✓
2. account in unique keys ✓
3. account in hash (not context) ✓
4. version bump for cache invalidation ✓
5. region unchanged (correct — only account was the problem) ✓
6. break documented ✓
