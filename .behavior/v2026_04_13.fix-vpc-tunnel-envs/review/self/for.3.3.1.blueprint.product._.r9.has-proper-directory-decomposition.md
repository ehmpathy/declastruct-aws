# self-review r9: has-proper-directory-decomposition

## blueprint directory structure audit

### filediff tree from blueprint

```
src/
├── domain.objects/
│   ├── [~] DeclaredAwsVpcTunnel.ts
│   └── [~] DeclaredAwsVpcTunnel.test.ts
│
└── domain.operations/
    └── vpcTunnel/
        ├── [~] castIntoDeclaredAwsVpcTunnel.ts
        ├── [+] castIntoDeclaredAwsVpcTunnel.test.ts
        └── utils/
            ├── [~] getTunnelHash.ts
            └── [~] getTunnelHash.test.ts
```

### layer verification

| file | layer | correct? |
|------|-------|----------|
| DeclaredAwsVpcTunnel.ts | domain.objects/ | yes — domain declaration |
| DeclaredAwsVpcTunnel.test.ts | domain.objects/ | yes — collocated test |
| castIntoDeclaredAwsVpcTunnel.ts | domain.operations/vpcTunnel/ | yes — transformer in operations |
| castIntoDeclaredAwsVpcTunnel.test.ts | domain.operations/vpcTunnel/ | yes — collocated test |
| getTunnelHash.ts | domain.operations/vpcTunnel/utils/ | yes — utility in utils/ |
| getTunnelHash.test.ts | domain.operations/vpcTunnel/utils/ | yes — collocated test |

**holds**: all files in correct layers.

### subdomain namespace verification

extant structure found via glob:
```
domain.operations/
├── ec2Instance/
├── iamRole/
├── iamUser/
├── lambda/
├── lambdaAlias/
├── lambdaVersion/
├── vpcTunnel/
│   ├── castIntoDeclaredAwsVpcTunnel.ts
│   ├── getVpcTunnel.ts
│   ├── setVpcTunnel.ts
│   └── utils/
│       ├── getTunnelHash.ts
│       └── ...
└── ...
```

blueprint matches extant pattern:
- vpcTunnel/ subdomain directory (not flat at domain.operations/)
- utils/ subdirectory for utility functions
- operations at subdomain root level

**holds**: blueprint follows extant subdomain namespace pattern.

### domain.objects/ structure

extant domain.objects/ is flat (no subdirectories by resource):
```
domain.objects/
├── DeclaredAwsEc2Instance.ts
├── DeclaredAwsIamRole.ts
├── DeclaredAwsVpcTunnel.ts
└── ...
```

blueprint adds no new files to domain.objects/, only modifies extant.

**holds**: consistent with flat domain.objects/ pattern.

### bounded context check

| change | bounded context | appropriate? |
|--------|-----------------|--------------|
| DeclaredAwsVpcTunnel.ts | vpcTunnel | yes — the domain object |
| getTunnelHash.ts | vpcTunnel | yes — tunnel identity utility |
| castIntoDeclaredAwsVpcTunnel.ts | vpcTunnel | yes — tunnel transformer |

**holds**: all changes within vpcTunnel bounded context.

## summary

| check | status |
|-------|--------|
| files in correct layers | pass |
| subdomain directories used | pass |
| matches extant structure | pass |
| bounded contexts respected | pass |

## what holds

directory decomposition is correct:
1. domain.objects/ flat (matches extant)
2. domain.operations/vpcTunnel/ namespaced (matches extant)
3. utils/ subdirectory for utilities (matches extant)
4. all files in appropriate layers

## issues found

none.
