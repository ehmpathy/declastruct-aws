# rule.require.ec2-freetier-instances

## .what

EC2 integration and acceptance tests must use the cheapest available instance types to minimize cost.

## .why

- tests do not need high-performance instances
- free-tier eligible instances (`t2.micro`, `t3.micro`) sufficient for validation
- prevents accidental cost spikes from powerful instance types
- keeps test infrastructure costs near zero

## .pattern

```typescript
const ec2Instance = DeclaredAwsEc2Instance.as({
  exid: 'declastruct-acceptance-instance',
  instanceType: 't2.micro', // free-tier eligible
  // ...
});
```

## .allowed instance types

| type | vcpu | memory | free tier |
|------|------|--------|-----------|
| `t2.micro` | 1 | 1 GiB | yes (750 hrs/mo) |
| `t3.micro` | 2 | 1 GiB | yes (750 hrs/mo) |
| `t2.nano` | 1 | 0.5 GiB | no |
| `t3.nano` | 2 | 0.5 GiB | no |

prefer `t2.micro` or `t3.micro` for free-tier eligibility.

## .enforcement

- EC2 test with instance type larger than `t3.micro` = blocker
- exception: test specifically validates instance type behavior

## .see also

- `rule.require.ec2-test-cleanup` — terminate instances after tests
