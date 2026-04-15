# self-review r7: role-standards-coverage

## rule directories checked

1. `practices/code.prod/evolvable.domain.objects/`
2. `practices/code.prod/evolvable.domain.operations/`
3. `practices/code.prod/evolvable.procedures/`
4. `practices/code.prod/pitofsuccess.errors/`
5. `practices/code.prod/pitofsuccess.typedefs/`
6. `practices/code.test/scope.coverage/`
7. `practices/code.test/frames.behavior/`

## coverage verification: what should be present?

### DeclaredAwsVpcTunnel.ts

**should present: jsdoc on new fields**

| requirement | status | evidence |
|-------------|--------|----------|
| `.what` on account | present | line 54: `.what = the aws account id...` |
| `.what` on region | present | line 59: `.what = the aws region...` |

**should present: types defined**

| requirement | status | evidence |
|-------------|--------|----------|
| account type | present | line 56: `account: string` |
| region type | present | line 61: `region: string` |
| unique includes new fields | present | line 94: `['account', 'region', ...]` |

**should present: validation**

| requirement | status | evidence |
|-------------|--------|----------|
| runtime validation | not needed | domain-objects handles via DomainEntity base class |
| type-level validation | present | typescript enforces required fields |

### getTunnelHash.ts

**should present: jsdoc header**

| requirement | status | evidence |
|-------------|--------|----------|
| `.what` | present | line 7: "generates a deterministic hash..." |
| `.why` | present | line 8: "enables consistent identification..." |
| `.note` | present | line 9: "includes account and region..." |

**should present: return type**

| requirement | status | evidence |
|-------------|--------|----------|
| explicit return type | present | line 13: `): string => {` |

**should present: error handle**

| requirement | status | evidence |
|-------------|--------|----------|
| error handle | not needed | pure function, no i/o, no failure modes |

### test coverage

**rule.require.test-coverage-by-grain**:

| grain | file | test type | status |
|-------|------|-----------|--------|
| domain object | DeclaredAwsVpcTunnel.ts | unit | present: DeclaredAwsVpcTunnel.test.ts |
| transformer | getTunnelHash.ts | unit | present: getTunnelHash.test.ts |
| transformer | castIntoDeclaredAwsVpcTunnel.ts | unit | present: castIntoDeclaredAwsVpcTunnel.test.ts |
| orchestrator | getVpcTunnel.ts | integration | present: getVpcTunnel.test.ts |
| orchestrator | setVpcTunnel.ts | integration | present: setVpcTunnel.test.ts |

**should present: test for new fields**

| test file | account tested | region tested |
|-----------|----------------|---------------|
| DeclaredAwsVpcTunnel.test.ts | yes (fixtures) | yes (fixtures) |
| getTunnelHash.test.ts | yes (fixtures + diff test) | yes (fixtures + diff test) |
| castIntoDeclaredAwsVpcTunnel.test.ts | yes (explicit assertion) | yes (explicit assertion) |
| getVpcTunnel.test.ts | yes (fixtures) | yes (fixtures) |
| setVpcTunnel.test.ts | yes (fixtures) | yes (fixtures) |

**should present: tests for differentiation behavior**

| test | status | evidence |
|------|--------|----------|
| different account produces different hash | present | getTunnelHash.test.ts: "same tunnel via/into/from with different account" |
| different region produces different hash | present | getTunnelHash.test.ts: "same tunnel via/into/from with different region" |
| unique keys assertion updated | present | DeclaredAwsVpcTunnel.test.ts: expects `['account', 'region', ...]` |

### error handle coverage

**rule.require.failfast** check:

| file | needs error handle | status |
|------|---------------------|--------|
| DeclaredAwsVpcTunnel.ts | no (declaration only) | n/a |
| getTunnelHash.ts | no (pure function) | n/a |
| castIntoDeclaredAwsVpcTunnel.ts | extant (uses assure) | unchanged |
| getVpcTunnel.ts | extant | unchanged |
| setVpcTunnel.ts | extant | unchanged |

## gaps found

none. all required patterns are present:
- jsdoc on new fields
- types defined
- tests updated
- differentiation tests added
- no absent error handles (pure functions need none)

## what holds (coverage evidence)

1. **domain object coverage**
   - new fields have jsdoc (lines 53-60)
   - new fields have explicit types (lines 56, 61)
   - unique array includes new fields (line 94)

2. **operation coverage**
   - getTunnelHash has full jsdoc header
   - explicit return type declared
   - no error handle needed (pure function)

3. **test coverage**
   - all affected files have tests
   - new differentiation tests added for account and region
   - all fixtures updated with new fields
   - explicit assertions for account/region pass-through

4. **type coverage**
   - RefByUnique<typeof DeclaredAwsVpcTunnel> now requires account + region
   - typescript enforces presence at compile time
   - no `any` types introduced

