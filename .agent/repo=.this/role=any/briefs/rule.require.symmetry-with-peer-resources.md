# rule.require.symmetry-with-peer-resources

## .what

a new `DeclaredAwsX` must be **symmetric** with its peer resources — those that share an AWS
service or umbrella. symmetry spans two axes:

1. **namespace** — the name carries the AWS service prefix, so peers cluster
   (`DeclaredAws<Service><Resource>`).
2. **shape** — the same field patterns, identity conventions (`primary`/`unique`/`metadata`/
   `readonly`), DAO wire-up, and operation names as its peers.

when a new resource joins a family, retrofit the extant peers to the same namespace so the
whole family stays symmetric — do not leave a half-namespaced set.

## .why

- **discoverability via autocomplete**: `DeclaredAwsCloudwatch…` surfaces every CloudWatch
  resource together; a bare `DeclaredAwsLogGroup` hides in the `L`s, divorced from its kin.
- **no surprises**: a reader who learns one resource in a family can predict the next
  (`rule.forbid.surprises`).
- **ubiqlang fidelity**: the service prefix mirrors AWS's own namespaces
  (`AWS::CloudWatch::*`, `AWS::Budgets::*`) — we speak AWS's language
  (`rule.require.ubiqlang`).
- **an asymmetric family is a smell**: if a new peer does not fit the family's shape, the
  boundary or the model is probably wrong — symmetry pressure surfaces that early.

## .the two axes

### namespace symmetry

name as `DeclaredAws<Service><Resource>`, service prefix first:

| service umbrella | resources (symmetric) |
| --- | --- |
| Cloudwatch | `DeclaredAwsCloudwatchLogGroup`, `DeclaredAwsCloudwatchMetricAlarm` |
| Budgets | `DeclaredAwsBudget`, `DeclaredAwsBudgetAction` |
| Cost Explorer | `DeclaredAwsCostAnomalyMonitor`, `DeclaredAwsCostAnomalySubscription` |
| EC2 | `DeclaredAwsEc2Instance`, `DeclaredAwsEc2LaunchTemplate`, `DeclaredAwsEc2InstanceSession` |
| IAM | `DeclaredAwsIamRole`, `DeclaredAwsIamPolicy`, `DeclaredAwsIamUser` |
| Organizations | `DeclaredAwsOrganization`, `DeclaredAwsOrganizationAccount`, `DeclaredAwsOrganizationServiceControlPolicy` |

acronym + brand letter-case follows the extant repo pattern: treat each as a **single word
with one initial cap**, the rest lowercase — as peers already show (`Ec2`, `Iam`, `Ssm`,
`Sso`, `Vpc`, `Rds`). brands follow the same rule: `Cloudwatch` (NOT `CloudWatch`), so it
stays symmetric with the acronym peers rather than carry a lone internal cap. this aligns
with `rule.forbid.shouts` (no all-caps acronyms) and the repo habit that treats acronyms as
regular words.

### shape symmetry

- **identity**: same `primary`/`unique`/`metadata`/`readonly` conventions as peers.
- **fields**: reuse peer field shapes and nested-object types (e.g. `DeclaredAwsTags`) rather
  than a bespoke shape.
- **DAO**: wire get/set/del via `genDeclastructDao` exactly as peers do.
- **operations**: `getOne<Resource>` / `set<Resource>` / `del<Resource>` /
  `castInto<Resource>`, aligned to peer operation names.
- **tests**: acceptance declared + asserted the same way (plan-inclusion + post-apply KEEP).

## .retrofit the family

when a new resource reveals the family should carry a namespace, rename the extant peers to
align — atomically, in one change:

- **before** (asymmetric): `DeclaredAwsLogGroup` + a new `DeclaredAwsCloudwatchMetricAlarm`.
- **after** (symmetric): `DeclaredAwsCloudwatchLogGroup` + `DeclaredAwsCloudwatchMetricAlarm`.

a rename of a public `DeclaredAwsX` is a back-compat break to the SDK contract — do it as a
focused, whole-family sweep (domain object, DAO, operations, provider registration, sdk
export, tests), not piecemeal.

## .examples

### 👎 asymmetric — a lone un-namespaced peer

```
DeclaredAwsLogGroup                 // CloudWatch Logs — but no CloudWatch prefix
DeclaredAwsCloudwatchMetricAlarm    // namespaced
```
the two CloudWatch resources do not cluster; the LogGroup hides from its family.

### 👍 symmetric — whole family carries the namespace

```
DeclaredAwsCloudwatchLogGroup
DeclaredAwsCloudwatchMetricAlarm
```

## .enforcement

- a new resource that breaks its family's namespace or shape convention = blocker
- a new peer added while extant peers stay un-namespaced (a split family) = blocker —
  retrofit the family
- a resource whose DAO/operation names diverge from peer patterns = nitpick

## .see also

- `rule.forbid.dao-for-narrow-usecase-resource` — symmetry applies to REAL resources;
  a usecase is a field-value instance, not a new symmetric type
- `rule.require.dao-and-acceptance-per-declared-resource` — the DAO + acceptance each peer
  must ship
- `rule.require.ubiqlang` (mechanic) — the service prefix mirrors AWS's namespaces
- `rule.forbid.surprises` (ergonomist) — symmetry makes the next peer predictable
- `rule.require.treestruct` (mechanic) — noun-hierarchy names that cluster by prefix
