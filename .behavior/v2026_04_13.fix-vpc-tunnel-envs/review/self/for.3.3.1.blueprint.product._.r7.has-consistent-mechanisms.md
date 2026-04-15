# self-review r7: has-consistent-mechanisms

## new mechanisms audit

### what mechanisms does the blueprint introduce?

| change | type | new mechanism? |
|--------|------|----------------|
| account field on DeclaredAwsVpcTunnel | domain object property | no — extends extant interface |
| account in unique array | domain object config | no — modifies extant array |
| getTunnelHash uses input.account | serialization logic | no — modifies extant function |
| hash version bump _v | version string | no — modifies extant constant |
| castIntoDeclaredAwsVpcTunnel pass-through | cast function | no — modifies extant function |
| castIntoDeclaredAwsVpcTunnel.test.ts | test file | no — tests aren't mechanisms |

**result**: zero new mechanisms. all changes modify extant components.

## duplication check

### does account field duplicate extant functionality?

**question**: is there already an account field elsewhere?

**answer**: no. `DeclaredAwsVpcTunnel` has no account field. `DeclaredAwsVpcTunnelVia`, `DeclaredAwsVpcTunnelInto`, `DeclaredAwsVpcTunnelFrom` are nested objects for via/into/from — they don't have account either.

**question**: is there an extant way to get account into the domain object?

**answer**: no. currently account comes from `context.aws.credentials.account` at hash time. there's no account in the domain object itself.

**holds**: account field is genuinely new, not duplicated.

### does getTunnelHash change duplicate extant functionality?

**question**: is there another hash function that uses input.account?

**answer**: no. `getTunnelHash` is the only hash function for tunnels. we modify it, not create a duplicate.

**holds**: no duplication.

### does castIntoDeclaredAwsVpcTunnel change duplicate extant functionality?

**question**: is there another cast function for this domain object?

**answer**: no. `castIntoDeclaredAwsVpcTunnel` is the only cast function. we modify it.

**holds**: no duplication.

### does new test file duplicate extant tests?

**question**: are there extant tests for castIntoDeclaredAwsVpcTunnel?

**answer**: no. we verified with Glob that no test file exists. this is a gap we fill.

**holds**: no duplication — we create an absent test.

## extant utilities check

### are there extant utilities we should reuse?

**question**: does the codebase have account-related utilities?

**answer**: from research, the codebase uses `context.aws.credentials.account`. this is the extant pattern. we don't create new account utilities — we make the account explicit in the domain object, then use it where context was used.

**question**: does the codebase have hash-related utilities?

**answer**: yes. `toHashSha256Sync` from `hash-fns`. the blueprint uses this extant utility — no new hash function.

**holds**: extant utilities are reused where applicable.

## patterns check

### do we follow extant patterns?

**domain object pattern**: extant domain objects have:
- interface with fields
- `public static unique = [...]`
- `public static nested = {...}`

our change follows this pattern: add field to interface, add to unique.

**hash pattern**: extant getTunnelHash uses serialize + toHashSha256Sync. our change keeps this pattern.

**cast pattern**: extant cast functions map input fields to output object. our change follows this.

**holds**: all changes follow extant patterns.

## summary

| check | result |
|-------|--------|
| new mechanisms | zero |
| duplicated functionality | none |
| reused utilities | yes (hash-fns) |
| followed patterns | yes (domain object, hash, cast) |

## what holds

the blueprint introduces zero new mechanisms:
1. all changes modify extant components
2. no functionality is duplicated
3. extant utilities are reused
4. extant patterns are followed

## issues found

none.
