# self-review r2: has-questioned-deletables

## feature traceability

### feature 1: add account field to DeclaredAwsVpcTunnel

**traces to**: vision line 67 "add account field to DeclaredAwsVpcTunnel", wisher confirmed option 1

**deletable?** no — this is the core fix

### feature 2: add account to unique keys

**traces to**: vision line 22 "resource identity = bastion + cluster + account"

**deletable?** no — without this, identity doesn't include account

### feature 3: update getTunnelHash to use input.account

**traces to**: criteria usecase.1 "tunnel identity includes account"

**deletable?** no — hash must use the explicit account

### feature 4: bump hash version to v2026_04_13

**traces to**: implementation necessity — old cache files should be invalidated

**question**: is this traced to vision/criteria?

**answer**: not explicitly, but it's a technical necessity. old cache files with old hash scheme should not match new declarations. this prevents confusion at rollout time.

**deletable?** could skip, but would cause stale cache issues

**decision**: keep — it's 1 line change with significant benefit

### feature 5: update tests

**traces to**: criteria (implicit) — any change requires test coverage

**deletable?** no — tests are mandatory

## component simplification

### component 1: DeclaredAwsVpcTunnel domain object

**can be removed?** no — it's the core entity

**simplest version?** yes — we add one string field. that's minimal.

### component 2: getTunnelHash

**can be removed?** no — it computes cache file identity

**simplest version?** yes — we change one line (context → input)

### component 3: castIntoDeclaredAwsVpcTunnel

**can be removed?** no — it constructs the domain object

**simplest version?** yes — we pass through one additional field

## deletable candidates

| item | traced | deletable? |
|------|--------|------------|
| account field | yes | no |
| account in unique | yes | no |
| hash uses input.account | yes | no |
| hash version bump | implicit | no (prevents stale cache) |
| test updates | implicit | no |

## what holds

no unnecessary features. the blueprint contains only:
1. the required change (account field)
2. the consequence of that change (unique keys, hash, cast)
3. necessary maintenance (version bump, tests)

## issues found

none. all components are minimal and traced.
