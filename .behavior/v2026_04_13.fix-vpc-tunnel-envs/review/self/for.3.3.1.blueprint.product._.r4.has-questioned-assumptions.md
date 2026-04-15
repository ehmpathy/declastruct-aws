# self-review r4: has-questioned-assumptions

## deeper assumption analysis

re-read the blueprint line by line. found additional hidden assumptions:

### assumption 8: castIntoDeclaredAwsVpcTunnel.ts exists

**what we assume**: file exists at `src/domain.operations/vpcTunnel/castIntoDeclaredAwsVpcTunnel.ts`

**evidence check needed**: the blueprint lists this file for modification. if it doesn't exist, blueprint is wrong.

**research shows**: from 3.1.3.research.internal.product.code.prod._.yield.md, the cast function exists. it was found during code analysis.

**holds?** yes — file exists per internal research

### assumption 9: castIntoDeclaredAwsVpcTunnel.test.ts may not exist

**what we assume**: blueprint says "(if extant)" — uncertainty about test file

**what if it doesn't exist?**: we'd need to create the test file, not just modify it. this changes scope.

**question**: why didn't research verify this?

**fix**: this should be verified before execution. if file doesn't exist, test tree should show `[+]` not `[~]`.

**holds?** partially — needs verification at execution time

### assumption 10: account is not in nested

**what we assume**: `nested = { via, into, from }` — account excluded

**what if opposite were true?**: if account were a nested object (like DeclaredAwsAccount), we'd need to add it to nested. but account is a primitive string, not a domain object.

**evidence**: AWS account IDs are 12-digit strings. no complex structure. primitive, not nested.

**holds?** yes — account is primitive string

### assumption 11: account is not in readonly

**what we assume**: account is not added to readonly array

**what if opposite were true?**: readonly contains ['pid'] — values that can't be set by user, only by system. account is user-provided (from config), not system-generated.

**evidence**: readonly is for system-generated values. account is explicit input from consumer.

**holds?** yes — account is user input, not system-generated

### assumption 12: no other files consume DeclaredAwsVpcTunnel

**what we assume**: only the files listed in filediff tree need changes

**what if opposite were true?**: if genDeclastructDao, getVpcTunnel, or setVpcTunnel also reference the domain object directly, they might need updates.

**evidence check**: research showed DAO wraps get/set operations. the DAO uses RefByUnique<DeclaredAwsVpcTunnel>. when unique changes, RefByUnique changes automatically. callers using the type will get typescript errors if they don't pass account.

**holds?** yes — typescript will enforce updates at call sites

### assumption 13: hash returns 16 chars

**what we assume**: blueprint says "return sha256 hash (16 chars)"

**question**: is this accurate? sha256 is 64 hex chars. 16 chars suggests truncation.

**evidence**: from research, `getTunnelHash` uses `toHashSha256Sync` with slice or truncation. this is extant behavior, not new.

**holds?** yes — extant behavior, not our concern

### assumption 14: the "different credentials" test tests context

**what we assume**: extant test uses different context to prove hash differs

**what we change**: test should use different tunnelRef.account instead

**question**: does the extant test actually use context.aws.credentials.account? if so, we change the test to use input.for.tunnel.account instead.

**evidence**: from 3.1.3.research.internal.product.code.test._.yield.md, the test "account differentiation test via context" exists. we change it to use tunnelRef.account.

**holds?** yes — we're deliberately changing test from context-based to input-based

## summary of new assumptions

| assumption | evidence source | holds |
|------------|-----------------|-------|
| castIntoDeclaredAwsVpcTunnel exists | internal research | yes |
| test file may not exist | blueprint uncertainty | needs verification |
| account not in nested | string primitive | yes |
| account not in readonly | user input | yes |
| no other files need changes | typescript enforcement | yes |
| hash returns 16 chars | extant behavior | yes |
| test uses context (to be changed) | internal research | yes |

## issues found

1. **test file existence**: blueprint shows uncertainty with "(if extant)". this should be verified at execution time. if file doesn't exist, create it. if it exists, modify it.

**recommendation**: keep blueprint as-is. execution phase will handle existence check.

## what holds

all assumptions are grounded except test file existence, which is acceptable uncertainty (handled at execution).
