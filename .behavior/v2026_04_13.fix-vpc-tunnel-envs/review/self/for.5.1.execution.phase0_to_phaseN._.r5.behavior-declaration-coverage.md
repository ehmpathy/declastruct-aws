# self-review r5: behavior-declaration-coverage

## coverage check

read vision, criteria, and blueprint yield files. verified each requirement against actual code line by line.

### vision requirements verification

from `1.vision.yield.md`:

| requirement | verification |
|-------------|--------------|
| "add account and region fields to DeclaredAwsVpcTunnel" | verified: DeclaredAwsVpcTunnel.ts:56 `account: string`, line 61 `region: string` |
| "add account and region to unique keys" | verified: DeclaredAwsVpcTunnel.ts:94 `unique = ['account', 'region', 'via', 'into', 'from']` |
| "hash and unique stay in sync" | verified: getTunnelHash.ts:19-23 uses same fields as unique |

### criteria verification

from `2.1.criteria.blackbox.yield.md`:

**usecase.1: tunnel identity includes account + region**

| criterion | code verification |
|-----------|-------------------|
| identity includes account + region | DeclaredAwsVpcTunnel.ts:94 — `unique = ['account', 'region', ...]` |
| error if account absent | typescript enforces — field is required (not optional) |
| error if region absent | typescript enforces — field is required (not optional) |
| diff account = diff identity | getTunnelHash.test.ts:76-100 — "different account" produces different hash |

**usecase.2: parallel tunnels**

| criterion | code verification |
|-----------|-------------------|
| dev + prod coexist | getTunnelHash.test.ts — different account = different hash = different cache file |
| diff region = diff identity | getTunnelHash.test.ts:102-140 — "different region" produces different hash |

**usecase.3: idempotent operations**

| criterion | code verification |
|-----------|-------------------|
| same twice = "in sync" | getTunnelHash.test.ts:20-29 — consistent hash test |

### blueprint verification

from `3.3.1.blueprint.product.yield.md`:

**filediff tree**:

| file | blueprint | actual |
|------|-----------|--------|
| DeclaredAwsVpcTunnel.ts | `[~] add account + region` | line 56 + 61: added |
| DeclaredAwsVpcTunnel.test.ts | `[~] update tests` | all fixtures include account + region |
| castIntoDeclaredAwsVpcTunnel.ts | `[~] pass through` | line 21: `...input.unique` spreads all unique fields |
| castIntoDeclaredAwsVpcTunnel.test.ts | `[+] create test` | created with account + region assertions |
| getTunnelHash.ts | `[~] use input` | line 19-20: uses `input.for.tunnel.account` and `.region` |
| getTunnelHash.test.ts | `[~] update tests` | all fixtures include account + region |

**codepath tree**:

DeclaredAwsVpcTunnel.ts:
- `[+] account: string` — verified at line 56
- `[+] region: string` — verified at line 61
- `[~] unique = ['account', 'region', 'via', 'into', 'from']` — verified at line 94

getTunnelHash.ts:
- `[~] account: input.for.tunnel.account` — verified at line 19
- `[~] region: input.for.tunnel.region` — verified at line 20
- `[○] _v: 'v2025_11_27'` — verified at line 24

castIntoDeclaredAwsVpcTunnel.ts:
- `...input.unique` at line 21 spreads account + region automatically

**test tree**:

| test | blueprint | actual |
|------|-----------|--------|
| DeclaredAwsVpcTunnel.test.ts instantiation | add account + region | fixtures include both |
| DeclaredAwsVpcTunnel.test.ts unique keys | expect includes | asserts `['account', 'region', ...]` |
| castIntoDeclaredAwsVpcTunnel.test.ts | create | created at lines 1-51 |
| getTunnelHash.test.ts consistent | add to fixtures | fixtures include account + region |
| getTunnelHash.test.ts different account | split from "different credentials" | separate test at lines 76-100 |
| getTunnelHash.test.ts different region | split from "different credentials" | separate test at lines 102-140 |

**implementation notes**:

| note | verification |
|------|--------------|
| keep v2025_11_27 | getTunnelHash.ts:24 — version unchanged |
| hash and unique in sync | both use: account, region, via, into, from |
| account + region as strings | DeclaredAwsVpcTunnel.ts:56,61 — both `string` type |

## gaps found

none. every requirement from vision, criteria, and blueprint verified against code.

## what holds

all requirements covered:

1. **account + region fields added** — DeclaredAwsVpcTunnel.ts:56,61
2. **unique includes both** — DeclaredAwsVpcTunnel.ts:94
3. **hash uses input fields** — getTunnelHash.ts:19-20
4. **spread passes through** — castIntoDeclaredAwsVpcTunnel.ts:21
5. **all tests updated** — fixtures include account + region throughout
6. **implementation notes followed** — version unchanged, types are strings
