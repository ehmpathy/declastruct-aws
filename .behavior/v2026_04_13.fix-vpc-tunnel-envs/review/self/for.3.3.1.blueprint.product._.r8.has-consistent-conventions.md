# self-review r8: has-consistent-conventions

## name conventions audit

### domain object field names

| blueprint name | extant pattern | match? |
|----------------|----------------|--------|
| `account` | other domain objects use `account` | yes |

verified by codebase search: DeclaredAwsIamUser uses `account: RefByPrimary<...>`. we use `account: string` — same name, different type (justified in r8 mechanisms review).

### unique array position

| blueprint | pattern question |
|-----------|------------------|
| `['account', 'via', 'into', 'from']` | is "account first" consistent? |

checked extant patterns:
- DeclaredAwsIamUser: `['account', 'username']` — account first
- DeclaredAwsVpcTunnel extant: `['via', 'into', 'from']` — no account

**observation**: when account is present, it comes first. we follow this pattern.

**holds**: account first is consistent with extant.

### file name conventions

| blueprint file | convention | match? |
|----------------|------------|--------|
| DeclaredAwsVpcTunnel.ts | `Declared<Provider><Resource>.ts` | yes |
| DeclaredAwsVpcTunnel.test.ts | `<file>.test.ts` | yes |
| getTunnelHash.ts | `get<Entity>Hash.ts` | yes |
| getTunnelHash.test.ts | `<file>.test.ts` | yes |
| castIntoDeclaredAwsVpcTunnel.ts | `castInto<DomainObject>.ts` | yes |
| castIntoDeclaredAwsVpcTunnel.test.ts | `<file>.test.ts` | yes |

**holds**: all file names follow extant conventions.

### function name conventions

| blueprint function | convention | match? |
|--------------------|------------|--------|
| getTunnelHash | `get<Entity>Hash` | yes — extant function |
| castIntoDeclaredAwsVpcTunnel | `castInto<DomainObject>` | yes — extant function |

**holds**: function names follow extant conventions.

### version string convention

| blueprint | extant | match? |
|-----------|--------|--------|
| `_v: 'v2026_04_13'` | `_v: 'v2025_11_27'` | yes — same format |

**holds**: version string follows extant format (v<year>_<month>_<day>).

### test name conventions

from blueprint test tree:

| test name | convention | match? |
|-----------|------------|--------|
| "instantiation: add account field" | `<aspect>: <what>` | yes |
| "unique keys: expect includes account" | `<aspect>: <expectation>` | yes |
| "consistent hash: add account to tunnelRef" | `<property>: <what>` | yes |
| "different tunnels: add account to tunnelRefs" | `<property>: <what>` | yes |
| "different credentials: use different tunnelRef.account" | `<property>: <what>` | yes |
| "account pass-through: verify account in output" | `<aspect>: <what>` | yes |

**holds**: test names follow extant patterns.

### new terms check

| blueprint term | extant term? | new? |
|----------------|--------------|------|
| account | yes (used in DeclaredAwsIamUser) | no |
| unique | yes (standard domain-objects term) | no |
| hash | yes (used in getTunnelHash) | no |
| cast | yes (used in castInto functions) | no |

**holds**: no new terms introduced. all terms are extant.

## summary

| convention | status |
|------------|--------|
| field names | consistent |
| unique array position | consistent (account first) |
| file names | consistent |
| function names | consistent |
| version string format | consistent |
| test names | consistent |
| terms | all extant, no new |

## what holds

all name conventions follow extant patterns:
1. `account` field name matches extant usage
2. account first in unique array matches extant pattern
3. file, function, test names follow conventions
4. version string format matches extant
5. no new terms introduced

## issues found

none. all conventions are consistent with extant codebase.
