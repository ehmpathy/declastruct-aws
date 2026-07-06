# rule.require.ec2-test-cleanup-both-ends

## .what

EC2 integration tests must clean up instances in BOTH beforeAll AND afterAll.

## .why

afterAll cleanup alone is insufficient:
- if a test run crashes mid-execution, afterAll never runs
- orphaned instances accumulate, consume vCPU quota
- subsequent test runs fail with VcpuLimitExceeded
- chicken-and-egg: tests fail → cleanup skipped → quota stays full

beforeAll cleanup breaks the cycle:
- cleans up orphans from prior crashed runs
- ensures clean slate before test execution
- makes tests self-heal

## .pattern

```typescript
describe('ec2Instance', () => {
  const instanceIds: string[] = [];

  // cleanup BEFORE: terminate orphans from prior crashed runs
  beforeAll(async () => {
    const context = await getSampleAwsApiContext();
    const ec2 = new EC2Client({ region: context.aws.credentials.region });

    // find orphaned test instances by tag
    // note: 'running' and 'stopped' are AWS API state names
    const orphans = await ec2.send(new DescribeInstancesCommand({
      Filters: [
        { Name: 'tag:Purpose', Values: ['integration-test'] },
        { Name: 'instance-state-name', Values: ['running', 'stopped'] },
      ],
    }));

    const orphanIds = orphans.Reservations?.flatMap(r =>
      r.Instances?.map(i => i.InstanceId).filter(Boolean) ?? []
    ) ?? [];

    if (orphanIds.length > 0) {
      await ec2.send(new TerminateInstancesCommand({ InstanceIds: orphanIds }));
    }
  });

  // cleanup AFTER: terminate instances created in this run
  afterAll(async () => {
    if (instanceIds.length === 0) return;
    const context = await getSampleAwsApiContext();
    const ec2 = new EC2Client({ region: context.aws.credentials.region });
    await ec2.send(new TerminateInstancesCommand({ InstanceIds: instanceIds }));
  });

  // tests must tag instances for cleanup detection
  given('[case1] instance lifecycle', () => {
    // ...
  });
});
```

## .requirements

1. **tag all test instances** with `Purpose: integration-test` (or similar)
2. **beforeAll**: terminate any instances with test tag
3. **afterAll**: terminate instances created in current run
4. **track instance IDs** in array for afterAll cleanup

## .enforcement

- EC2 test with only afterAll cleanup = blocker
- EC2 test without consistent tags = blocker

## .see also

- `rule.require.ec2-freetier-instances` — use cheapest instances
- `rule.require.ec2-test-cleanup` — the original afterAll-only rule (superseded)
