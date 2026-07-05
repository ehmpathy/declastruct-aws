# rule.require.vpc-test-cleanup-both-ends

## .what

integration tests that create VPCs (or their dependents — subnets, security
groups, internet gateways, route tables) must clean up in BOTH `beforeAll` AND
`afterAll` — the same both-ends discipline required for EC2 instances and SSM
sessions. the `beforeAll` cleanup must sweep ORPHANS by tag, not just this run's
resources.

## .why

`afterAll`-only cleanup is insufficient:

- if a run crashes or is killed mid-flight, `afterAll` never runs, so the VPC it
  created (and every dependent) leaks
- VPCs have a hard per-region account quota (default 5). leaked VPCs accumulate
  and eventually every later run fails at `CreateVpc` with `VpcLimitExceeded`
- internet gateways have their OWN quota and leak INDEPENDENTLY: a VPC cascade
  only reaps the IGWs still attached to a swept VPC, so a detached orphan (whose
  VPC was already deleted) survives and fills the IGW quota
  (`InternetGatewayLimitExceeded`)
- the failure is a chicken-and-egg trap: tests fail -> `afterAll` skipped ->
  quota stays full -> next run fails too

a real incident: `vpc.journey` had only an `afterAll` teardown. crashed runs left
orphan VPCs and detached IGWs; the account hit both `VpcLimitExceeded` and
`InternetGatewayLimitExceeded`, which flaked every VPC-touching suite in CI.

`beforeAll` orphan sweep breaks the cycle — it reaps leftovers from prior crashed
runs before this run creates anything, so the suite self-heals.

## .the account-cap wrinkle (VPC-specific)

unlike EC2 instances, VPCs have a LOW hard cap (5) and the account also holds
PERSISTENT non-test VPCs (the default VPC, the acceptance VPC, the provision-infra
VPC). that leaves very few slots. jest runs integration files in PARALLEL
(`maxWorkers: 50%`), so N VPC-creating files race the cap simultaneously.

two consequences:

1. **consolidate**: keep VPC-creating integration coverage in as FEW files as the
   cap allows (ideally one). fold new-op coverage into the extant journey rather
   than add parallel VPC-creating files. within one file, cases run sequentially,
   so only one test VPC is alive at a time.
2. **per-file stable purpose tag**: if more than one VPC-creating file must exist,
   give EACH its own stable `purpose` tag and sweep only that purpose — otherwise
   a sibling file's `beforeAll` sweep nukes another file's in-flight VPC (they
   share the tag). this mirrors how the EC2 files each use a distinct purpose
   (`session-test`, `sdks-test`, ...).

## .pattern

```typescript
const TEST_VPC_TAGS = {
  managedBy: 'declastruct',
  purpose: 'integration-test', // this file's stable purpose
} as const;

// reap orphan VPCs (cascade dependents) AND detached orphan IGWs by tag
const sweepOrphanTestVpcs = async (context: ContextAwsApi): Promise<void> => {
  // VPCs: enumerate by tag, cascade-delete each (subnets, sgs, igws, rtbs, vpc)
  const orphans = await getAllVpcs({ by: { tags: TEST_VPC_TAGS } }, context);
  for (const orphan of orphans)
    if (orphan.id) await delVpcCascade({ ref: { id: orphan.id } }, context);

  // detached IGWs leak independently — reap by tag directly (raw SDK teardown)
  const ec2 = new EC2Client({ region: context.aws.credentials.region });
  const igws = await ec2.send(
    new DescribeInternetGatewaysCommand({
      Filters: Object.entries(TEST_VPC_TAGS).map(([k, v]) => ({
        Name: `tag:${k}`,
        Values: [v],
      })),
    }),
  );
  for (const igw of igws.InternetGateways ?? []) {
    if (!igw.InternetGatewayId) continue;
    for (const a of igw.Attachments ?? [])
      if (a.VpcId)
        await ec2
          .send(new DetachInternetGatewayCommand({ InternetGatewayId: igw.InternetGatewayId, VpcId: a.VpcId }))
          .catch(swallowNotFound);
    await ec2
      .send(new DeleteInternetGatewayCommand({ InternetGatewayId: igw.InternetGatewayId }))
      .catch(swallowNotFound);
  }
};

describe('vpc.journey', () => {
  // BEFORE: sweep orphans from prior crashed runs
  beforeAll(async () => {
    const context = await getSampleAwsApiContext();
    await sweepOrphanTestVpcs(context);
  });

  // AFTER: delete this run's stack, then sweep as a safety net
  afterAll(async () => {
    // ...delete this run's resources in reverse dependency order...
    await sweepOrphanTestVpcs(context);
  });
});
```

## .requirements

1. **tag every test VPC and dependent** with a stable `purpose` (per file)
2. **beforeAll**: `sweepOrphanTestVpcs` — reap orphan VPCs (cascade) + detached
   orphan IGWs by tag
3. **afterAll**: delete this run's stack, then `sweepOrphanTestVpcs` as a net
4. **consolidate** VPC-creating coverage to respect the low VPC cap under parallel
   jest workers

## .the reusable ops

- `getAllVpcs({ by: { tags } })` — enumerate VPCs by tag (the sweep primitive)
- `delVpcCascade({ ref: { id } })` — delete a VPC + all attached dependents in the
  one safe order (route tables -> internet gateways -> security groups -> subnets
  -> vpc)

teardown may use raw SDK for the detached-IGW reap; teardown is exempt from
`rule.require.declarative-test-infra` (which governs SETUP), exactly as the EC2
both-ends rule shows raw `EC2Client` + `Terminate` in cleanup.

## .enforcement

- VPC-creating test with only `afterAll` cleanup = blocker
- `beforeAll` that cleans only this run (no orphan sweep by tag) = blocker
- VPC sweep that reaps VPCs but not detached orphan IGWs = blocker
- more parallel VPC-creating files than the account cap allows = blocker

## .see also

- `rule.require.ec2-test-cleanup-both-ends` — the instance-level analogue
- `rule.require.ssm-session-cleanup-both-ends` — the session-level analogue
- `rule.require.declarative-test-infra` — governs SETUP; teardown is exempt
