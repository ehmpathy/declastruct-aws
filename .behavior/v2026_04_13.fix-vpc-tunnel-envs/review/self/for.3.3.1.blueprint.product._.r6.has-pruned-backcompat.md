# self-review r6: has-pruned-backcompat

## deeper backwards compatibility analysis

i re-read the blueprint and thought about rollout scenarios.

### scenario 1: old code runs after new code deployed

| step | what happens |
|------|-------------|
| old code computes hash | uses v2025_11_27, context.aws.credentials.account |
| old code looks for cache | not found (new code used different hash) |
| old code creates tunnel | works fine |

**concern?** no — old code works, just doesn't find new cache.

### scenario 2: new code runs after old code created cache

| step | what happens |
|------|-------------|
| new code computes hash | uses v2026_04_13, input.for.tunnel.account |
| new code looks for cache | not found (old cache has different hash) |
| new code creates tunnel | works fine |

**concern?** no — new code works, just doesn't find old cache.

### scenario 3: tunnel already open, new code runs

| step | what happens |
|------|-------------|
| old tunnel runs on port 15432 | has old cache file with old hash |
| new code computes hash | different hash due to version bump |
| new code looks for cache | not found |
| new code checks for tunnel | declastruct does process check, not cache check |

**question**: does declastruct rely on cache or process check for "in sync"?

**evidence from research**: the "in sync" determination uses:
1. cache file (hash-based)
2. process check (pid-based)

if cache miss but process found, declastruct should still report "in sync" based on pid. the cache is for persistence across restarts, not for "in sync" detection in same session.

**concern?** needs verification — but likely no issue because process check is separate from cache.

### scenario 4: mixed deployment (some nodes updated, some not)

| step | what happens |
|------|-------------|
| node A (new code) creates tunnel | writes cache with new hash |
| node B (old code) checks tunnel | computes old hash, misses cache |
| node B creates duplicate tunnel? | depends on process check vs cache check |

**concern?** potentially — but this is standard rollout concern, not a reason to add backwards compat.

## what backwards compat COULD look like

if we wanted backwards compat, we could:
1. make account optional with fallback to context
2. read both old and new hash versions
3. migrate old cache files to new format

**did wisher request any of this?** no.

the vision explicitly chose option 1 (explicit account) which is a **break**.

## are we accidentally including backwards compat?

**checked**:
- account field is required (not optional)
- no fallback to context.aws.credentials.account
- no old hash version support
- no migration helper

**found**: none. we are deliberately NOT including backwards compat.

## open question surfaced

the version bump means extant cache files will not be found by new code. this could cause new code to report "needs tunnel" for a tunnel that is already open.

**is this a problem?** probably not, because:
1. process check (pid) is separate from cache check
2. cache is for persistence, not live detection

**should we flag for wisher?** no — this is implementation detail, not user-visible behavior change.

## what holds

1. no backwards compat was requested
2. no backwards compat was added
3. the break is intentional and documented
4. rollout scenarios are handled by extant process-check logic

## issues found

none. backwards compat is explicitly NOT desired. the version bump is intentional cache invalidation, not a backwards compat concern.
