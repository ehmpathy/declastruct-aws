# self-review r11: has-behavior-declaration-coverage

## the wish

from `.behavior/v2026_04_13.fix-vpc-tunnel-envs/0.wish.md`:

> we gotta fix this so we can create use.vpc.tunnel across different envs

and:

> the root cause is in declastruct-aws — the DeclaredAwsVpcTunnel resource identity doesn't include stage-differentiation

## the problem traced

the user showed a scenario:
- dev tunnel: port 15432, host *.dev, aws account 874711128849
- prod tunnel: port 15433, host *.prod, aws account 398838478359

when both tunnels are declared, the prod tunnel was found "in sync" because:
1. DeclaredAwsVpcTunnel.unique = `['via', 'into', 'from']`
2. account was NOT part of unique
3. tunnels for different accounts collided on identity check

## requirements extracted from wish

| # | requirement | source |
|---|-------------|--------|
| R1 | tunnels for different AWS accounts must have distinct identities | "doesn't include stage-differentiation" |
| R2 | identity must include account in unique keys | root cause analysis |
| R3 | hash must include account for cache file differentiation | cache collision implied |
| R4 | consumers must be updated to pass account | break required |

## blueprint coverage per requirement

### R1: distinct identity per account

**wish**: tunnels for dev account 874711128849 and prod account 398838478359 must not be confused.

**blueprint**:
- adds `account: string` to DeclaredAwsVpcTunnel interface
- adds `account` to unique: `['account', 'via', 'into', 'from']`

**verification**: with account in unique, two tunnels with:
- same via, into, from
- different account

will be treated as different resources by domain-objects getUniqueIdentifier().

**holds**: R1 satisfied.

### R2: account in unique keys

**wish**: root cause is "resource identity doesn't include stage-differentiation"

**blueprint**:
- `public static unique = ['account', 'via', 'into', 'from'] as const`

**verification**: account is first in unique array (scope-first pattern, matches DeclaredAwsIamUser pattern).

**holds**: R2 satisfied.

### R3: hash includes account for cache

**wish** (implied): cache files must not collide for different accounts.

**blueprint**:
- getTunnelHash serializes: `account: input.for.tunnel.account`
- version bump: `_v: 'v2026_04_13'`

**verification**:
- same tunnel with different account → different hash → different cache file
- version bump invalidates old caches that didn't include account

**holds**: R3 satisfied.

### R4: consumer update documented

**wish** (implied): break is acceptable if documented.

**blueprint** implementation notes:
> **break for consumers**: all consumers must update to pass `account`
> - declapract-typescript-ehmpathy use.vpc.tunnel.ts must add `account: config.aws.account`

**holds**: R4 satisfied.

## did we skip a requirement?

### vision check

the vision was: enable tunnels across different envs (dev vs prod).

**covered**: account field enables this.

### criteria check

from criteria (implied from problem statement):
- [ ] dev and prod tunnels have distinct identity → covered by unique keys
- [ ] cache files don't collide → covered by hash with account
- [ ] consumers know about break → covered by implementation notes

all criteria covered.

## issues found

none. all requirements traced from wish to blueprint.

## what holds

blueprint fully covers the behavior declaration:
1. R1: distinct identity via account in unique ✓
2. R2: account first in unique array ✓
3. R3: hash includes account, version bumped ✓
4. R4: consumer break documented ✓
