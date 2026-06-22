# rule.require.ec2-test-cleanup

## .what

EC2 integration tests must terminate instances in `afterAll` to prevent cost accumulation.

note: acceptance tests are exempt — they verify persistent infrastructure via declastruct plan/apply workflow.

## .why

- EC2 instances incur hourly charges even when idle
- terminated instances release elastic IPs and network interfaces
- prevents test resource leak across test runs
- ensures consistent test state

## .pattern

```typescript
describe('ec2Instance.integration', () => {
  const instanceIds: string[] = [];

  afterAll(async () => {
    // terminate all instances created in this test suite
    if (instanceIds.length === 0) return;

    const ec2 = new EC2Client({ region });
    await ec2.send(
      new TerminateInstancesCommand({ InstanceIds: instanceIds }),
    );
  });

  // ... tests track created instances via instanceIds.push(instance.id)
});
```

## .enforcement

- EC2 test without `afterAll` termination = blocker
- test that creates instance must track its id for cleanup

## .see also

- `rule.require.ec2-freetier-instances` — use cheapest instances
