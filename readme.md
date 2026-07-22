# declastruct-aws

![test](https://github.com/ehmpathy/declastruct-aws/workflows/test/badge.svg)
![publish](https://github.com/ehmpathy/declastruct-aws/workflows/publish/badge.svg)

Declarative control of Aws resource constructs, via [declastruct](https://github.com/ehmpathy/declastruct).

Declare the structures you want. Plan to see the changes required. Apply to make it so 🪄


# install

```sh
npm install -s declastruct-aws
```

# use via cli

## example.1

### wish ✨

declare the resources you wish to have - and what state you wish them to be in

```ts
import { UnexpectedCodePathError } from 'helpful-errors';

export const getProviders = async (): Promise<DeclastructProvider[]> => [
  getDeclastructAwsProvider(
    {},
    {
      log: console,
    },
  ),
];

export const getResources = async (): Promise<DomainEntity<any>[]> => {
  // declare the resources you wish to construct
};
```

### plan 🔮

plan how to achieve the wish of resources you've declared

this will emit a plan that declares the changes required in order to fulfill the wish

```sh
npx declastruct plan --wish provision/github/resources.ts --output provision/github/.temp/plan.json
```

### apply 🪄

apply the plan to fulfill the wish

this will apply only the changes declared in the plan - and only if this plan is still applicable

```sh
npx declastruct apply --plan provision/github/.temp/plan.json
```


## example.2 = open a vpc tunnel via an ec2 instance

```ts
import { RefByUnique } from 'domain-objects';
import { getDeclastructAwsProvider, DeclaredAwsRdsCluster, DeclaredAwsEc2Instance, DeclaredAwsSsmVpcTunnel } from 'declastruct-aws';

export const getProviders = async (): Promise<DeclastructProvider[]> => [
  getDeclastructAwsProvider(
    {},
    {
      log: console,
    },
  ),
];

export const getResources = async (): Promise<DomainEntity<any>[]> => {
  const cluster = RefByUnique.as<typeof DeclaredAwsRdsCluster>({
    name: 'yourdb',
  });
  const bastion = RefByUnique.as<typeof DeclaredAwsEc2Instance>({
    exid: 'vpc-main-bastion',
  })
  const tunnel = DeclaredAwsSsmVpcTunnel.as({
    via: { mechanism: 'aws.ssm', bastion }
    into: { cluster },
    from: { host: 'localhost', port: 777_5432 },
    status: "OPEN",
  })
  return [tunnel];
};
```


## example.3 = open an ssh tunnel to an ec2 instance

```ts
import * as fs from 'fs';
import { RefByUnique } from 'domain-objects';
import {
  getDeclastructAwsProvider,
  DeclaredAwsEc2Instance,
  DeclaredAwsEc2SshKeyAuthorized,
  DeclaredAwsSsmSshTunnel,
} from 'declastruct-aws';

export const getProviders = async (): Promise<DeclastructProvider[]> => [
  getDeclastructAwsProvider(
    {},
    {
      log: console,
    },
  ),
];

export const getResources = async (): Promise<DomainEntity<any>[]> => {
  const instance = RefByUnique.as<typeof DeclaredAwsEc2Instance>({
    exid: 'my-dev-instance',
  });

  // authorize your SSH key on the instance
  const sshKey = DeclaredAwsEc2SshKeyAuthorized.as({
    instance,
    publicKey: fs.readFileSync(`${process.env.HOME}/.ssh/id_ed25519.pub`, 'utf8'),
    comment: 'my-laptop',
  });

  // open SSH tunnel via SSM
  const sshTunnel = DeclaredAwsSsmSshTunnel.as({
    instance,
    from: { port: 2222 },
    into: { port: 22 },
    status: 'OPEN',
  });

  return [sshKey, sshTunnel];
};
```

after `npx declastruct apply`, SSH in:
```bash
ssh -i ~/.ssh/id_ed25519 -p 2222 ec2-user@localhost
```


## example.4 = provision an ec2 instance with hibernation

```ts
import { RefByUnique } from 'domain-objects';
import {
  getDeclastructAwsProvider,
  DeclaredAwsEc2LaunchTemplate,
  DeclaredAwsEc2Instance,
  DeclaredAwsEc2InstanceSession,
  DeclaredAwsVpcSubnet,
  DeclaredAwsVpcSecurityGroup,
} from 'declastruct-aws';

export const getProviders = async (): Promise<DeclastructProvider[]> => [
  getDeclastructAwsProvider(
    {},
    {
      log: console,
    },
  ),
];

export const getResources = async (): Promise<DomainEntity<any>[]> => {
  // declare launch template with hibernation enabled
  const template = DeclaredAwsEc2LaunchTemplate.as({
    exid: 'my-dev-template',
    instanceType: 't3.micro',
    imageId: 'ami-0c55b159cbfafe1f0',  // Amazon Linux 2023
    hibernation: true,
    rootVolumeEncrypted: true,  // required for hibernation
    rootVolumeSize: 16,         // must be >= instance RAM
    iamInstanceProfile: null,
    userData: null,
    tags: { purpose: 'dev' },
  });

  // declare instance
  const instance = DeclaredAwsEc2Instance.as({
    exid: 'my-dev-instance',
    template: { exid: template.exid },
    subnet: RefByUnique.as<typeof DeclaredAwsVpcSubnet>({ exid: 'my-subnet' }),
    securityGroups: [RefByUnique.as<typeof DeclaredAwsVpcSecurityGroup>({ exid: 'my-sg' })],
    tags: { purpose: 'dev' },
  });

  // control lifecycle via session
  const session = DeclaredAwsEc2InstanceSession.as({
    instance: { exid: instance.exid },
    status: 'active',  // 'active' | 'stopped' | 'hibernated'
  });

  return [template, instance, session];
};
```

to hibernate the instance, change `status: 'hibernated'` and re-apply:
```bash
npx declastruct plan --wish resources.ts --into plan.json
npx declastruct apply --plan plan.json
```


## example.5 = deploy a lambda with version and alias

```ts
import { RefByUnique } from 'domain-objects';
import { ConstraintError } from 'helpful-errors';
import {
  calcAwsLambdaConfigHash,
  DeclaredAwsIamRole,
  DeclaredAwsIamRolePolicyAttachedInline,
  DeclaredAwsLambda,
  DeclaredAwsLambdaAlias,
  DeclaredAwsLambdaVersion,
  genDeclaredAwsLambdaCode,
  getDeclastructAwsProvider,
} from 'declastruct-aws';

export const getProviders = async (): Promise<DeclastructProvider[]> => [
  getDeclastructAwsProvider(
    {},
    {
      log: console,
    },
  ),
];

export const getResources = async (): Promise<DomainEntity<any>[]> => {
  // declare iam role for lambda execution
  const lambdaRole = DeclaredAwsIamRole.as({
    name: 'my-lambda-role',
    path: '/',
    description: 'Role for lambda execution',
    policies: [
      {
        effect: 'Allow',
        principal: { service: 'lambda.amazonaws.com' },
        action: 'sts:AssumeRole',
      },
    ],
    tags: { managedBy: 'declastruct' },
  });

  // declare inline policy for CloudWatch Logs permissions
  const lambdaRolePolicy = DeclaredAwsIamRolePolicyAttachedInline.as({
    name: 'cloudwatch-logs',
    role: RefByUnique.as<typeof DeclaredAwsIamRole>(lambdaRole),
    document: {
      statements: [
        {
          effect: 'Allow',
          action: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents',
          ],
          resource: '*',
        },
      ],
    },
  });

  // declare lambda function ($LATEST) with code from zip
  const lambda = DeclaredAwsLambda.as({
    name: 'svc-sea-turtle.prod.getSandbars',
    runtime: 'nodejs18.x',
    handler: 'index.handler',
    timeout: 30,
    memory: 128,
    role: RefByUnique.as<typeof DeclaredAwsIamRole>(lambdaRole),
    envars: { NODE_ENV: 'production' },
    code: genDeclaredAwsLambdaCode({ zipUri: '.artifact/contents.zip' }),
    tags: { managedBy: 'declastruct' },
  });

  // publish immutable version (fingerprinted by code + config hash)
  const lambdaVersion = DeclaredAwsLambdaVersion.as({
    lambda: RefByUnique.as<typeof DeclaredAwsLambda>(lambda),
    hash: {
      code: lambda.code?.hash ?? ConstraintError.throw('lambda.code.hash is required'),
      config: calcAwsLambdaConfigHash({ of: lambda }),
    },
  });

  // point LIVE alias to this version
  const lambdaAlias = DeclaredAwsLambdaAlias.as({
    name: 'LIVE',
    lambda: RefByUnique.as<typeof DeclaredAwsLambda>(lambda),
    version: RefByUnique.as<typeof DeclaredAwsLambdaVersion>(lambdaVersion),
    description: 'live traffic alias',
  });

  return [lambdaRole, lambdaRolePolicy, lambda, lambdaVersion, lambdaAlias];
};
```

this pattern enables:
- **change detection**: `code.hash` enables declastruct to detect when code changed and deploy only when needed
- **immutable versions**: each deploy publishes a new version fingerprinted by `hash: { code, config }`
- **aliased endpoints**: invoke via `function:LIVE` for stable endpoints across deploys
- **safe rollbacks**: retarget aliases to previous versions without redeploy
- **canary deploys**: use `routingConfig.additionalVersionWeights` to split traffic between versions

## example.6 = manage SSM parameters — plaintext config + write-only secrets

declare non-secret config and secrets side by side. the secret is **write-only**: `plan`
never reads its value (no `GetParameter`, no `kms:Decrypt`), so a least-privilege plan role
needs only `ssm:DescribeParameters` for it — exactly the posture terraform cannot offer.

```ts
import {
  getDeclastructAwsProvider,
  DeclaredAwsSsmParameterPlain,
  DeclaredAwsSsmParameterSecure,
} from 'declastruct-aws';

export const getProviders = async () => [
  await getDeclastructAwsProvider({}, { log: console }),
];

export const getResources = async () => {
  // plaintext config — the value is NOT sensitive, so drift is detected by a
  // normal value-compare (plan reads it via GetParameter; no decrypt needed)
  const logLevel = DeclaredAwsSsmParameterPlain.as({
    name: '/svc-notifications/prod/log-level',
    value: 'info',
    description: 'the log level',
    tags: { managedBy: 'declastruct' },
  });

  // secret (SecureString) — WRITE-ONLY. plan never reads the value; supply a value to
  // create/rotate, leave it undefined to KEEP the extant secret (no read, no decrypt).
  // best practice: source the value from an env var set ONLY when you intend to write.
  const authToken = DeclaredAwsSsmParameterSecure.as({
    name: '/svc-notifications/prod/twilio/auth-token',
    value: process.env.TWILIO_AUTH_TOKEN, // undefined = keep; present = create/rotate
    keyId: null, // null = the account default aws/ssm key (a CMK is optional)
    description: 'twilio auth token',
    tags: { managedBy: 'declastruct' },
  });

  return [logLevel, authToken];
};
```

```sh
# a least-privilege plan role needs NO GetParameter and NO kms:Decrypt for the secret
npx declastruct plan  --wish resources.ts --into plan.json
npx declastruct apply --plan plan.json
```

this pattern enables:
- **write-only secrets**: `plan` reconciles a `SecureString` via metadata only — no
  `GetParameter`, no `kms:Decrypt`, and no secret-derived artifact stored anywhere to leak
- **least-privilege plan roles**: the plan role can be denied `kms:Decrypt` outright, so a CI
  plan job can no longer read prod secrets (the whole risk terraform bakes in)
- **explicit rotation**: supply a `value` to write/rotate; leave it undefined for a steady-state
  `KEEP` — the secret is never read back into a plan or state file
- **plaintext value-compare**: non-secret `String` params still detect value drift normally,
  since their value is not sensitive
