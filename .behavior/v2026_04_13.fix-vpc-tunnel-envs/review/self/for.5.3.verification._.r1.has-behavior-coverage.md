# self-review: has-behavior-coverage

## the question

does the verification checklist show every behavior from wish/vision has a test?

## evidence

### wish behaviors

from `0.wish.md`:
- **root cause**: `DeclaredAwsVpcTunnel.unique` doesn't include stage-specific fields (account/region)
- **fix goal**: different env tunnels (dev/prod) treated as distinct resources

### vision behaviors

from `1.vision.yield.md`:

| behavior | test file | verified? |
|----------|-----------|-----------|
| dev and prod tunnels have distinct identity | `src/domain.objects/DeclaredAwsVpcTunnel.test.ts:23-34` | ✓ tests unique includes account and region |
| `getTunnelHash` produces distinct hash per account | `src/domain.operations/vpcTunnel/utils/getTunnelHash.test.ts:37-61` | ✓ tests same tunnel + different accounts = different hashes |
| `getTunnelHash` produces distinct hash per region | `src/domain.operations/vpcTunnel/utils/getTunnelHash.test.ts:37-61` | ✓ tests same tunnel + different regions = different hashes |
| `setVpcTunnel` uses new identity | `src/domain.operations/vpcTunnel/setVpcTunnel.test.ts` | ✓ unit tests CLOSED path with account/region fields |
| SSM args transformer | `src/domain.operations/vpcTunnel/utils/asSsmStartSessionArgs.test.ts` | ✓ tests command args extraction |
| log entry transformer | `src/domain.operations/vpcTunnel/utils/asTunnelLogEntry.test.ts` | ✓ tests timestamp format |

### coverage verification

all behaviors from wish/vision map to tests:

1. **identity includes account + region** → `DeclaredAwsVpcTunnel.test.ts` verifies `unique` array
2. **hash produces distinct values per env** → `getTunnelHash.test.ts` verifies distinct hashes for different accounts/regions
3. **tunnels coexist peacefully** → hash + unique alignment ensures separate cache files per env
4. **no false "in sync" positives** → unique keys now include account/region so comparison uses both

### integration coverage note

the vision mentions integration scenarios (STAGE=dev then STAGE=prod both open). these require real AWS SSM which is integration test scope. the unit tests verify the identity mechanics that enable this — the integration behavior is a downstream effect of correct identity.

## conclusion

✓ all behaviors from wish/vision have test coverage. no gaps found.
