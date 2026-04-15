# self-review r3: has-questioned-deletables

## deeper trace verification

### feature 1: account field on DeclaredAwsVpcTunnel

**vision line 67**: "add account field to DeclaredAwsVpcTunnel"
**wisher confirmation**: option 1 selected — explicit account field

**question**: can we achieve the goal without this field?

**answer**: no. the vision states "explicit account" — option 2 (context-aware) was rejected. without the field, tunnel identity cannot include account explicitly.

**deletable?** no — this is the wisher's selected solution

### feature 2: account in unique keys

**vision line 22**: "resource identity = bastion + cluster + account"
**criteria usecase.1**: "tunnel identity includes account"

**question**: can we skip unique and rely only on hash?

**answer**: no. declastruct uses unique keys for identity comparison. the hash is for cache file paths. both must include account for correct behavior.

**deletable?** no — without this, declastruct cannot distinguish tunnels by account

### feature 3: getTunnelHash uses input.account

**criteria usecase.1**: "tunnel identity includes account"

**question**: can we keep context.aws.credentials.account instead?

**answer**: no. the vision chose option 1 (explicit). with account now in the domain object, the hash must use the explicit field. context-based account would be option 2, which was rejected.

**deletable?** no — this aligns hash source with the explicit field pattern

### feature 4: hash version bump to v2026_04_13

**question**: is this traced to vision or criteria?

**answer**: not explicitly. however, old cache files used the old hash scheme (account from context). new declarations use account from input. to prevent stale cache confusion, version bump invalidates old files.

**question**: what happens if we skip this?

**answer**: old cache files would be read with old hash. new declarations would compute different hash. cache miss on every declaration. no functional break, but wasted i/o.

**deletable?** could skip — but 1 line change prevents cache thrash

**decision**: keep — cost is 1 line, benefit is clean rollout

### feature 5: test updates

**question**: can we skip tests?

**answer**: no. tests verify the fix works. without tests, no proof of correctness.

**deletable?** no — tests are non-negotiable

## component deep-dive

### can DeclaredAwsVpcTunnel.account be optional?

**question**: should account be `string | null` instead of `string`?

**answer**: no. the vision states "declaration without account field = error". typescript enforces required field. optional would allow ambiguous state.

### can castIntoDeclaredAwsVpcTunnel be removed?

**question**: is this cast function necessary?

**answer**: yes. it constructs domain object from unique ref + status + pid. now it must also pass account. without it, domain object cannot be built from parts.

### can we merge changes into fewer files?

**question**: can we reduce file count?

**answer**: the changes are already minimal:
- 1 domain object file (add field + unique)
- 1 cast file (pass through field)
- 1 hash file (change source)
- 3 test files (verify changes)

each file has single responsibility. no further reduction possible.

## final tally

| item | traced | necessary | deletable |
|------|--------|-----------|-----------|
| account field | vision line 67 | yes | no |
| account in unique | vision line 22, criteria usecase.1 | yes | no |
| hash uses input.account | criteria usecase.1 | yes | no |
| hash version bump | implicit | prevents cache thrash | no (1 line, high value) |
| test updates | implicit | verify correctness | no |

## what holds

all features traced. all components minimal. no deletable items.

the blueprint contains the minimal set of changes to implement option 1 (explicit account field).

## issues found

none.
