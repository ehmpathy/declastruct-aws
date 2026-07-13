# rule.forbid.dao-for-narrow-usecase-resource

## severity: blocker

## .what

> **composites materialize a declarative resource that otherwise would not exist; they don't
> narrow the scope of an extant one.**

that one line is the whole rule. **forbid** a `DeclaredAwsX` domain object + DAO that merely
narrows the scope of an extant resource. a `DeclaredAwsX` + DAO earns its place in ONE of two
ways:

1. **it maps to a REAL AWS resource** — a construct AWS itself models as its own resource
   type (its own CloudFormation type / SDK `Create*` command / API entity), OR
2. **it is a COMPOSITE** that materializes a net-new declarative resource — one absent from
   AWS's model — by composition of multiple raw operations + casts.

we FORBID a third case: a **narrow usecase** that merely narrows the scope of ONE extant
resource (a preset of its field values), with no net-new resource. that is field values +
a factory, not a new type.

## .the boundary — materialize a net-new resource vs narrow an extant one

the core axis: **does this materialize a NEW declarative resource, or does it merely NARROW
the scope of a resource that already exists?**

- **materialize (allow)**: a net-new declarative noun absent from AWS's resource model. it has
  its own identity + shape; there is no upstream resource it is a subset of. it is composed
  into existence from raw operations + casts (decode-friction is the *symptom* of this
  composition, not the test itself).
- **narrow (forbid)**: no new noun — just an extant resource with its aperture stopped down to
  a preset (a specific metric, namespace, policy body). same resource, narrower scope. that is
  a *view*, not a resource — express it as field values + a factory.

ask two questions:

> **Q1. does AWS model this as its own resource?** (own CFN type / `Create*` command)
> **Q2. does this MATERIALIZE a net-new declarative resource — a noun AWS has none of, composed
> from multiple raw ops + casts — rather than NARROW an extant one?**

| Q1 | Q2 | verdict |
| --- | --- | --- |
| yes | — | **allow** — real AWS resource (e.g. `DeclaredAwsBudget`, `DeclaredAwsCloudwatchMetricAlarm`) |
| no | **yes (materializes)** | **allow** — composite; a net-new resource (e.g. the log-group reports below) |
| no | **no (narrows)** | **forbid** — a narrowed view of an extant resource; use the generic resource + a factory |

the failure mode we forbid answers **no to both**: neither a real AWS resource NOR a net-new
composed noun — it just narrows one generic resource to a preset.

## .why

this repo is a declarative mirror of AWS. a narrow config-type would:

- **diverge from AWS's ubiqlang** — AWS has no such resource, and it composes no extra
  operation, so the name is a synonym we invented (`rule.require.ubiqlang`,
  `rule.forbid.term.addition.synonym`).
- **explode the type surface** — every account/metric/threshold permutation would spawn a new
  `DeclaredAwsX` + DAO + provider registration + acceptance, most of it duplicate.
- **surprise users** — a reader expects `DeclaredAwsX` to be either an AWS resource they can
  find in docs, or a composite that clearly earns its name; a bare parameterization is neither
  (`rule.forbid.surprises`).

but a **composite** is the OPPOSITE — it EARNS its name. it hides raw-SDK decode-friction
(multi-call sequences, metric math, result casting) behind one domain-named read. that is the
transformer/orchestrator pattern the architect briefs prize
(`rule.require.orchestrators-as-narrative`, `philosophy.transformer-orchestrator-separation`).
a forbid on composites would push that decode-friction back onto every caller.

## .the test, applied

### 👎 forbidden — narrow config usecase (no to both Qs)

| usecase-type (do NOT create) | it is really | do instead |
| --- | --- | --- |
| `DeclaredAwsEstimatedChargesAlarm` | preset fields on `AWS::CloudWatch::Alarm` (namespace `AWS/Billing`, metric `EstimatedCharges`) | generic `DeclaredAwsCloudwatchMetricAlarm` + an `asEstimatedChargesAlarm` factory |
| `DeclaredAwsLambdaErrorAlarm` | preset fields on `AWS::CloudWatch::Alarm` (metric `Errors`) | generic alarm + a factory |
| `DeclaredAwsDenyExpensiveScp` | preset fields on `AWS::Organizations::Policy` | generic SCP + a factory |

### 👍 allowed — composite that wraps decode-friction (no to Q1, YES to Q2)

these are NOT real AWS resources, yet they EARN a `DeclaredAws*` because each composes a
multi-call raw-SDK sequence + result cast into one clean domain read:

| composite | client | raw ops it composes | domain concept it yields |
| --- | --- | --- | --- |
| `DeclaredAwsCloudwatchLogGroupReportCostOfIngestion` | `@aws-sdk/client-cloudwatch` | `GetMetricDataCommand` on the `IncomingBytes` metric + cost cast | a cost-of-ingestion report |
| `DeclaredAwsCloudwatchLogGroupReportDistOfPattern` | `@aws-sdk/client-cloudwatch-logs` | `StartQueryCommand` → poll `GetQueryResultsCommand` + cast | a pattern-distribution report |

without these composites, every caller would hand-roll the metric query / the start-poll-get
Logs Insights dance + the cast — textbook decode-friction. the composite hides it. (note: a
composite is read-only-friendly — a `getOne*` with no `set`/`del` is fine; it need not be
mutable to earn its name.)

### 👍 allowed — real AWS resource (yes to Q1)

`DeclaredAwsBudget`, `DeclaredAwsBudgetAction`, `DeclaredAwsCostAnomalyMonitor`,
`DeclaredAwsCloudwatchLogGroup`, `DeclaredAwsCloudwatchMetricAlarm` — each 1:1 with an AWS
resource.

## .factory, not a type, for the forbidden case

if a narrow usecase is common enough to deserve ergonomics, a **named factory/transformer**
that returns the generic object is the right tool — never a new domain-object + DAO:

```ts
// 👍 a factory that presets the generic real resource — NOT a new DAO
export const asEstimatedChargesAlarm = (input: {
  name: string; threshold: number; alarmActions: Ref<...>[];
}): DeclaredAwsCloudwatchMetricAlarm => DeclaredAwsCloudwatchMetricAlarm.as({ /* preset field values */ });
```

## .enforcement

- a `DeclaredAwsX` + DAO that is neither a real AWS resource NOR a decode-friction composite
  (i.e. a bare parameterization of one real resource) = blocker
- a real AWS resource without a DAO = blocker (see the companion rule)
- a composite that hides genuine multi-call / cast decode-friction = allowed (encouraged)
- a named factory/transformer that returns a generic real resource = allowed (encouraged for
  common usecases)

## .see also

- `rule.require.symmetry-with-peer-resources` — name/shape a new resource like its peers
- `rule.require.dao-and-acceptance-per-declared-resource` — every REAL resource needs a DAO +
  acceptance; this rule bounds WHAT earns a `DeclaredAws*` in the first place
- `rule.require.orchestrators-as-narrative` (architect) — the composite IS an orchestrator that
  hides decode-friction
- `philosophy.transformer-orchestrator-separation` (architect) — why composites earn their name
- `rule.forbid.surprises` (ergonomist) — a bare parameterization-type surprises
- `rule.require.ubiqlang` (mechanic) — adopt AWS's language; do not mint synonyms
- `rule.prefer.wet-over-dry` (mechanic) — a common usecase earns a factory only once proven
