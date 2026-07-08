# rule.forbid.test-blocking-orphans

## .what

never leave orphaned AWS resources that can block the acceptance suite. when an
acceptance fixture's declaration changes, the extant resource in AWS becomes an
orphan — and for immutable resources that orphan blocks every future apply.

when you do leave one, prune it via the prune command — never patch around it.

## .why

some AWS resources are immutable — you cannot update them in place:

| resource | immutable attribute | blocks on |
|----------|--------------------|-----------|
| EC2 launch template | instanceType, imageId, iamInstanceProfile | upsert of extant |
| EC2 instance | subnet, template, securityGroups | upsert of extant |

when the acceptance resource declaration changes one of these attributes, the
plan computes UPDATE against the orphan that still carries the old value. the set
operation then throws "upsert not supported — immutable", and the apply aborts
before any downstream resource reconciles. the whole suite fails, and the failure
looks like a code defect when it is really stale state.

this exact trap cost a full acceptance debug cycle: a launch template orphan held
`iamInstanceProfile="declastruct-acceptance-ec2-profile"` and an instance orphan
sat in `subnet-private-1a`, both from a prior run whose declaration had since
changed to `iamInstanceProfile: null` and `subnet-1a`.

## .the rule

1. **before you change an immutable acceptance fixture's attributes**, prune the
   extant orphan first — otherwise the next apply is dead on arrival.
2. **when a run leaves an orphan**, reach for the prune command; do NOT add
   reactive per-error catches or rename the fixture to dodge the conflict.

## .how to prune

use the prune command (never run the `.ts` directly):

```sh
# demo infra defaults
./provision/aws.infra/account=demo/aws.prune.ec2.sh

# explicit stale acceptance fixtures
./provision/aws.infra/account=demo/aws.prune.ec2.sh \
  --instance declastruct-acceptance-instance \
  --template declastruct-acceptance-template
```

the `.sh` unlocks keyrack, sources the demo profile, and runs the idempotent
`del*` operations (a no-op if the orphan is already absent). then re-run acceptance.

## .enforcement

- immutable acceptance fixture attribute change without a prune-first step = blocker
- reactive per-conflict catch to dodge an orphan instead of prune = blocker
- an orphan left behind after a failed/aborted apply, un-pruned = blocker

## .see also

- `rule.require.ec2-test-cleanup` — integration tests terminate instances in afterAll
- `rule.require.ec2-freetier-instances` — use cheapest instances
- `provision/aws.infra/account=demo/aws.prune.ec2.sh` — the prune entrypoint
