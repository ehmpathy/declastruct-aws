# self-review: has-contract-output-variants-snapped

## the question

does each public contract have exhaustive snapshots?

## inventory of public contracts modified

### cli contracts

no cli commands were added or modified. the vpc tunnel is used programmatically via:
- `setVpcTunnel()` function
- `DeclaredAwsVpcTunnelDao` (internal)

there is no `vpc-tunnel` cli command.

### api contracts

no api endpoints were added or modified. this is a library package, not a service.

### sdk contracts

the sdk exports `DeclaredAwsVpcTunnel` domain object. this change:
- adds `account` and `region` fields to the type
- adds them to `unique` keys

**is this a public contract change?** yes — consumers must now provide `account` and `region`.

**does it need snapshots?** pause and think.

snapshots serve two purposes:
1. vibecheck in PRs — reviewers see actual output
2. drift detection — changes surface in diffs

for domain objects, the "output" is the serialized shape. but domain-objects already has its own tests for serialization. the user-faced contract is the TYPE, not runtime output.

**what would a snapshot test look like?**

```ts
expect(new DeclaredAwsVpcTunnel({
  account: '123',
  region: 'us-east-1',
  // ...
})).toMatchSnapshot();
```

this would snap the object shape. but:
- the shape IS the type definition
- typescript already enforces shape
- the unit tests verify `unique` keys

**my assessment**: domain objects are type contracts, not output contracts. snapshot tests add little value here — the type itself IS the snapshot.

## modified files review

| file | contract type | needs snapshot? |
|------|---------------|-----------------|
| DeclaredAwsVpcTunnel.ts | domain object | no (type is contract) |
| getTunnelHash.ts | internal | no |
| asSsmStartSessionArgs.ts | internal | no |
| asTunnelLogEntry.ts | internal | no |
| setVpcTunnel.ts | internal | no |

## conclusion

✓ no cli commands modified — no cli snapshots needed
✓ no api endpoints modified — no api snapshots needed
✓ sdk exports domain object type — type definition IS the contract
✓ internal functions do not face users — no snapshots needed

this change is internal domain mechanics. public contract change is type shape, verified via typescript compilation and unit tests.
