# self-review r10: has-proper-directory-decomposition

## per-file layer verification

### DeclaredAwsVpcTunnel.ts → domain.objects/

**is this file placed in the correct layer?**

yes. DeclaredAwsVpcTunnel is a domain object declaration — it extends DomainEntity and defines the shape of a VPC tunnel. domain.objects/ is the correct layer for domain declarations.

**does a transformer belong in domain.operations/, not contract/?**

n/a — this is a domain object, not a transformer.

**does a dao belong in access/daos/, not domain.operations/?**

n/a — this is a domain object, not a dao.

**does an api endpoint belong in contract/api/, not at src/ root?**

n/a — this is a domain object, not an endpoint.

**holds**: DeclaredAwsVpcTunnel.ts is correctly placed in domain.objects/.

### getTunnelHash.ts → domain.operations/vpcTunnel/utils/

**is this file placed in the correct layer?**

yes. getTunnelHash is a transformer that computes a hash from tunnel unique fields. transformers belong in domain.operations/.

**is this file namespaced under a subdomain directory?**

yes. it's under vpcTunnel/utils/, not flat at domain.operations/ root.

**does the directory structure reflect bounded contexts?**

yes. getTunnelHash is specific to vpcTunnel — it uses DeclaredAwsVpcTunnel unique fields. it doesn't belong to another bounded context.

**did we dump all files flat at the layer root?**

no. vpcTunnel/ subdomain directory exists and getTunnelHash is nested under vpcTunnel/utils/.

**holds**: getTunnelHash.ts is correctly placed in domain.operations/vpcTunnel/utils/.

### castIntoDeclaredAwsVpcTunnel.ts → domain.operations/vpcTunnel/

**is this file placed in the correct layer?**

yes. castInto* functions are transformers that convert data into domain objects. transformers belong in domain.operations/.

**is this file namespaced under a subdomain directory?**

yes. it's under vpcTunnel/, not flat at domain.operations/ root.

**are related operations grouped together?**

yes. castIntoDeclaredAwsVpcTunnel is alongside getVpcTunnel.ts and setVpcTunnel.ts — all vpcTunnel operations.

**holds**: castIntoDeclaredAwsVpcTunnel.ts is correctly placed in domain.operations/vpcTunnel/.

## extant structure comparison

### extant domain.operations/ pattern

checked via glob:
- ec2Instance/ — subdomain directory
- iamRole/ — subdomain directory
- lambda/ — subdomain directory with utils/
- vpcTunnel/ — subdomain directory with utils/

**pattern**: each resource type has its own subdomain directory. complex resources have utils/ subdirectories.

**blueprint matches**: vpcTunnel/ subdomain with utils/ matches the extant lambda/ pattern.

### extant domain.objects/ pattern

checked via read:
- flat structure (DeclaredAwsEc2Instance.ts, DeclaredAwsIamRole.ts, etc.)
- no subdirectories by resource type
- test files collocated

**blueprint matches**: no new subdirectories in domain.objects/. we only modify extant DeclaredAwsVpcTunnel.ts.

## new file placement check

### [+] castIntoDeclaredAwsVpcTunnel.test.ts

**placement**: domain.operations/vpcTunnel/castIntoDeclaredAwsVpcTunnel.test.ts

**is this correct?**

yes. test files are collocated with their source files. extant pattern shows castIntoDeclaredAwsVpcTunnel.ts at vpcTunnel/ root (not in utils/), so the test goes there too.

**verified**: extant vpcTunnel/setVpcTunnel.test.ts is collocated with setVpcTunnel.ts.

**holds**: new test file follows extant colocation pattern.

## summary

| file | layer | subdomain | correct? |
|------|-------|-----------|----------|
| DeclaredAwsVpcTunnel.ts | domain.objects/ | n/a (flat) | yes |
| DeclaredAwsVpcTunnel.test.ts | domain.objects/ | n/a (flat) | yes |
| castIntoDeclaredAwsVpcTunnel.ts | domain.operations/ | vpcTunnel/ | yes |
| castIntoDeclaredAwsVpcTunnel.test.ts | domain.operations/ | vpcTunnel/ | yes |
| getTunnelHash.ts | domain.operations/ | vpcTunnel/utils/ | yes |
| getTunnelHash.test.ts | domain.operations/ | vpcTunnel/utils/ | yes |

## what holds

1. **layer placement**: all files in correct layers per architecture rules
2. **subdomain namespace**: vpcTunnel/ directory for operations, flat for objects (matches extant)
3. **utils/ pattern**: getTunnelHash in utils/ matches extant lambda/utils/ pattern
4. **test colocation**: all tests collocated with source (matches extant)
5. **no flat dump**: no files placed flat at domain.operations/ root

## issues found

none.
