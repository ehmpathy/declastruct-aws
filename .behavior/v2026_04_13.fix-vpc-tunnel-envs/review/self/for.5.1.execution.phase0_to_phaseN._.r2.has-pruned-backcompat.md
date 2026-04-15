# self-review r2: has-pruned-backcompat

## backwards compatibility check

walked through `git diff HEAD -- src/` line by line.

### potential backwards-compat locations

| location | what changed | backcompat added? |
|----------|--------------|-------------------|
| DeclaredAwsVpcTunnel.ts | added account + region fields, updated unique | no |
| getTunnelHash.ts | removed context param, uses input fields | no |
| getTunnelHash.ts `_v` | kept at v2025_11_27 | user requested |
| getVpcTunnel.ts | removed context arg from getTunnelHash call | no |
| setVpcTunnel.ts | removed context arg from getTunnelHash call | no |
| all test files | added account + region to fixtures | no |

### detailed analysis

**1. getTunnelHash signature change**

old: `(input, context: ContextAwsApi)`
new: `(input)`

no backwards compat shim. callers updated directly:
- getVpcTunnel.ts:27 — removed context arg
- setVpcTunnel.ts:37 — removed context arg
- all test files — removed context arg

**verdict**: intentional contract change, no shim needed.

**2. cache file invalidation**

old hashes used `context.aws.credentials.account` and `context.aws.credentials.region`.
new hashes use `input.for.tunnel.account` and `input.for.tunnel.region`.

no migration code to handle old cache files.

**verdict**: intentional. old cache files lacked account/region differentiation — that was the bug. their invalidation is the fix.

**3. _v version string**

asked user explicitly:
> should we bump the version string `_v: 'v2025_11_27'`?

user chose to keep it. this was explicitly requested, not assumed.

**4. domain object fields**

added account + region as required fields. no optional/nullable defaults for backwards compat.

**verdict**: intentional. callers must provide account + region. that's the point.

## what holds

no unpruned backwards-compat found:

1. **no shims** — signature changes are direct, callers updated
2. **no migration** — cache invalidation is intentional (the fix)
3. **no deprecated params** — context removal is complete
4. **no optional fields** — account + region are required (intentional)
5. **version string** — kept per explicit user request

all contract changes are intentional and serve the fix.
