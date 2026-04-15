# self-review r10: has-behavior-declaration-coverage

## behavior declaration

from wish:
> the root cause is in declastruct-aws — the DeclaredAwsVpcTunnel resource identity doesn't include stage-differentiation

the core requirement: tunnels opened with different AWS account credentials should have distinct identities.

## blueprint coverage check

### requirement: different AWS accounts = different tunnel identity

**wish**: when dev tunnel and prod tunnel target same logical resource name, they should be distinct because they use different AWS credentials.

**blueprint addresses**:
1. adds `account: string` field to DeclaredAwsVpcTunnel interface
2. adds `account` to `unique = ['account', 'via', 'into', 'from']`
3. updates getTunnelHash to use `input.for.tunnel.account` instead of `context.aws.credentials.account`
4. bumps hash version to invalidate old cache

**holds**: blueprint enables distinct tunnel identity per account.

### requirement: consumers must pass account

**wish** (implicit): fix requires consumers to know which account credentials were used.

**blueprint addresses**:
- implementation notes #3: "all consumers must update to pass `account`"
- implementation notes #3: "declapract-typescript-ehmpathy use.vpc.tunnel.ts must add `account: config.aws.account`"

**holds**: break is documented.

### requirement: hash includes account for cache differentiation

**wish**: the tunnel hash must differ per account so cache files don't collide.

**blueprint addresses**:
- getTunnelHash serializes `account: input.for.tunnel.account`
- version bump `_v: 'v2026_04_13'` invalidates old caches

**holds**: hash differentiation addressed.

## test coverage per requirement

| requirement | test case | covered? |
|-------------|-----------|----------|
| account in domain object | DeclaredAwsVpcTunnel instantiation with account | yes |
| account in unique keys | DeclaredAwsVpcTunnel.unique includes account | yes |
| account in hash | getTunnelHash same account = same hash | yes |
| account in hash | getTunnelHash diff account = diff hash | yes |
| account pass-through | castIntoDeclaredAwsVpcTunnel outputs account | yes |

**holds**: all requirements have test coverage.

## gaps found

none. the blueprint covers the behavior declaration:
1. account field added to domain object
2. account added to unique keys for identity differentiation
3. account used in hash for cache file identity
4. tests cover all three aspects
5. consumer break documented

## what holds

blueprint fully covers the behavior requirement: tunnels for different AWS accounts now have distinct identities.
