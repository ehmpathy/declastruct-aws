# self-review r5: has-pruned-yagni

## explicit trace from criteria to blueprint

i re-read the criteria file and the vision. here is the explicit trace:

### usecase.1: tunnel identity includes account

| criteria | blueprint component | necessary? |
|----------|---------------------|------------|
| "tunnel identity includes the account" | account in unique keys | yes — required |
| "same logical name in different accounts produces different tunnel identities" | account in unique keys | yes — same component |
| "declaration without account field → error" | test: "without account (ts error)" | yes — typescript enforces |

**YAGNI check**: no extra validation code. typescript does the enforcement. minimal.

### usecase.2: parallel tunnels for different accounts

| criteria | blueprint component | necessary? |
|----------|---------------------|------------|
| "declastruct creates a new tunnel (not 'in sync')" | account in unique keys | yes — distinct identity |
| "dev tunnel opens on port 15432" | unchanged — ports from config | n/a — no change needed |

**YAGNI check**: no port-related changes. ports are already handled by extant code.

### usecase.3: idempotent tunnel operations

| criteria | blueprint component | necessary? |
|----------|---------------------|------------|
| "same declaration run twice → 'in sync' (KEEP)" | account in unique keys | yes — same ref = same identity |
| "port collision → error" | not in blueprint | not needed — extant code handles |

**YAGNI check**: port collision is NOT in blueprint. r1 review confirmed extant code handles this.

## verification: what IS in blueprint but NOT in criteria?

| blueprint component | in criteria? | justification |
|---------------------|--------------|---------------|
| account field | yes | usecase.1 |
| account in unique | yes | usecase.1 |
| hash uses input.account | implicit | necessary for correct hash |
| hash version bump _v | no | prevents cache thrash |
| cast pass-through | implicit | necessary for domain object construction |
| test updates | implicit | verification of changes |

### unrequested components:

1. **hash uses input.account** — implicit in "identity includes account". if identity changes, hash must change.

2. **hash version bump _v** — not in criteria. 1 line change, prevents stale cache files.
   - **question**: should this be flagged for wisher?
   - **answer**: no — trivial cost, clear benefit, no downside.

3. **cast pass-through** — implicit in domain object with account field.

4. **test updates** — implicit in any change.

## final YAGNI audit

| component | explicitly requested | implicitly required | YAGNI? |
|-----------|---------------------|---------------------|--------|
| account field | yes (vision line 67) | - | no |
| account in unique | yes (vision line 22) | - | no |
| hash uses input.account | no | yes (identity requires it) | no |
| hash version bump | no | no | borderline — keep (trivial) |
| cast pass-through | no | yes (field must propagate) | no |
| test updates | no | yes (any change needs tests) | no |

## what holds

all components are either:
1. explicitly requested (account field, unique)
2. implicitly required (hash source, cast, tests)
3. justified convenience (version bump — 1 line)

no YAGNI violations. no unrequested abstractions. no premature optimizations.

## issues found

none.
