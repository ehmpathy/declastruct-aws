# self-review: has-contract-output-variants-snapped (round 6)

## the question

does each public contract have exhaustive snapshots?

## what is a "contract output"?

contracts produce outputs that humans or machines consume:
- cli commands → terminal output
- api endpoints → json responses
- sdk functions → return values
- domain objects → serialized shapes

snapshots serve two purposes:
1. vibecheck in prs — reviewers see actual output
2. drift detection — changes surface in diffs

## inventory of public contracts modified

### sdk exports

from `src/contract/sdks/index.ts`:
- `DeclaredAwsVpcTunnel` — domain object (type contract)
- `DeclaredAwsVpcTunnelDao` — dao facade (orchestration)
- `getVpcTunnel` — retrieval operation
- `setVpcTunnel` — mutation operation

### what changed in each?

| export | change | output type |
|--------|--------|-------------|
| DeclaredAwsVpcTunnel | added account, region to unique | type shape |
| DeclaredAwsVpcTunnelDao | unchanged interface | n/a |
| getVpcTunnel | unchanged signature | n/a |
| setVpcTunnel | input requires account, region | DeclaredAwsVpcTunnel |

## analysis: which need snapshots?

### DeclaredAwsVpcTunnel — does NOT need snapshot

**why:**
- the "output" of a domain object is its serialized shape
- but the type definition IS the shape
- typescript compilation enforces shape correctness
- unit tests verify `unique` includes account, region (line 63-66)
- consumers that type-check against DeclaredAwsVpcTunnel get compile errors if shape changes

**what would a snapshot test add?**
```ts
expect(new DeclaredAwsVpcTunnel({ ... })).toMatchSnapshot();
```

this would snapshot: `{ account: '123', region: 'us-east-1', ... }`

but this is just the input echoed back. domain-objects already tests serialization in its own suite. the value here is zero.

### setVpcTunnel — does NOT need snapshot

**why:**
- returns `DeclaredAwsVpcTunnel` (same shape as input)
- requires real aws ssm connection to execute
- acceptance tests exist for sdk exports (see `declastruct.acceptance.test.ts`)
- unit tests verify closed path mechanics

**what would a snapshot test require?**
- real aws credentials
- real bastion instance
- real rds cluster
- specific port bindings

this is integration test scope, not unit test scope.

### getVpcTunnel — does NOT need snapshot

**why:**
- returns `DeclaredAwsVpcTunnel | null`
- requires real aws resources to execute
- same integration scope as setVpcTunnel

## comparison with extant acceptance tests

from `src/contract/sdks/declastruct.acceptance.test.ts`:
```ts
import { DeclaredAwsVpcTunnel, setVpcTunnel, getVpcTunnel } from './index';

describe('declastruct', () => {
  given('[case0] DeclaredAwsVpcTunnel is exported', () => {
    then('[t0] it should be importable', () => {
      expect(DeclaredAwsVpcTunnel).toBeDefined();
    });
  });
  // ...
});
```

the acceptance tests verify export availability, not output shapes. this is appropriate because:
- types enforce shape
- functions require infrastructure

## deeper question: am i overlooking something?

let me reconsider from first principles.

**the change:** account and region are now part of tunnel identity.

**the consumer impact:** consumers must now provide account and region.

**how is this verified?**
1. typescript compilation — consumers get errors if they omit account/region
2. unit tests — `DeclaredAwsVpcTunnel.unique` includes account, region
3. hash tests — different account/region produces different hash

**what would snapshots add?**
- visual confirmation of shape in pr? → type definition is already visible
- regression detection? → type changes require consumer updates anyway

## conclusion

✓ domain object shape = type definition, not runtime output
✓ sdk functions require aws infrastructure to produce output
✓ acceptance tests verify export availability
✓ type system enforces contract compliance
✓ unit tests verify identity mechanics

no snapshot tests needed because:
1. the contract is the type, not the serialized value
2. functions cannot produce output without aws resources
3. type changes surface at compile time, not runtime

this is not a gap in coverage — it's recognition that different contract types require different verification strategies.
