# self-review r4: behavior-declaration-coverage

## coverage check

read through vision, criteria, and blueprint. checked each requirement against code.

### vision requirements

| requirement | location | status |
|-------------|----------|--------|
| add account + region to DeclaredAwsVpcTunnel | DeclaredAwsVpcTunnel.ts:56-61 | done |
| add account + region to unique keys | DeclaredAwsVpcTunnel.ts:94 | done |
| hash and unique stay in sync | getTunnelHash uses same fields as unique | done |

### criteria coverage

#### usecase.1: tunnel identity includes account + region

| criterion | code location | status |
|-----------|---------------|--------|
| tunnel identity includes account and region | DeclaredAwsVpcTunnel.unique = ['account', 'region', ...] | done |
| same logical name in different accounts = different identities | getTunnelHash.test.ts: "different account" test | done |
| error if account field absent | typescript compiler enforces | done |
| error if region field absent | typescript compiler enforces | done |

#### usecase.2: parallel tunnels for different accounts/regions

| criterion | code location | status |
|-----------|---------------|--------|
| dev and prod tunnels coexist (different hashes) | getTunnelHash.test.ts: different account test | done |
| different regions = different identities | getTunnelHash.test.ts: different region test | done |

#### usecase.3: idempotent tunnel operations

| criterion | code location | status |
|-----------|---------------|--------|
| same declaration twice = "in sync" | getTunnelHash.test.ts: consistent hash test | done |
| port collision error | not in scope — extant behavior | n/a |

### blueprint coverage

#### filediff tree

| file | change | status |
|------|--------|--------|
| DeclaredAwsVpcTunnel.ts | add account + region fields | done |
| DeclaredAwsVpcTunnel.test.ts | update tests | done |
| castIntoDeclaredAwsVpcTunnel.ts | pass through (spread handles it) | done |
| castIntoDeclaredAwsVpcTunnel.test.ts | create test | done |
| getTunnelHash.ts | use input fields | done |
| getTunnelHash.test.ts | update tests | done |

#### codepath tree

**DeclaredAwsVpcTunnel.ts**:
- [+] account: string — done (line 56)
- [+] region: string — done (line 61)
- [~] unique = ['account', 'region', 'via', 'into', 'from'] — done (line 94)

**getTunnelHash.ts**:
- [~] account: input.for.tunnel.account — done
- [~] region: input.for.tunnel.region — done
- [○] _v: 'v2025_11_27' — kept as is

**castIntoDeclaredAwsVpcTunnel.ts**:
- no code change needed — spread (`...input.unique`) handles account + region

#### test tree

| test file | requirement | status |
|-----------|-------------|--------|
| DeclaredAwsVpcTunnel.test.ts | add account + region | done |
| DeclaredAwsVpcTunnel.test.ts | unique keys includes account + region | done |
| castIntoDeclaredAwsVpcTunnel.test.ts | create test | done |
| getTunnelHash.test.ts | add account + region to fixtures | done |
| getTunnelHash.test.ts | different account = different hash | done |
| getTunnelHash.test.ts | different region = different hash | done |

### implementation notes from blueprint

| note | status |
|------|--------|
| no version bump (keep v2025_11_27) | done |
| hash and unique in sync | done |
| account + region as strings (not refs) | done |

## gaps found

none. all requirements from vision, criteria, and blueprint are implemented.

## what holds

1. **vision satisfied** — explicit account + region in domain object
2. **criteria satisfied** — identity differentiation, typescript validation, idempotency
3. **blueprint satisfied** — all files changed, all tests updated, implementation notes followed
