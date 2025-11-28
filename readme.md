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


## example.2 = open a vpc tunnel

```ts
import { RefByUnique } from 'domain-objects';
import { getDeclastructAwsProvider, DeclaredAwsRdsCluster, DeclaredAwsEc2Instance, DeclaredAwsVpcTunnel } from 'declastruct-aws';

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
  const tunnel = DeclaredAwsVpcTunnel.as({
    via: { mechanism: 'aws.ssm', bastion }
    into: { cluster },
    from: { host: 'localhost', port: 777_5432 },
    status: "OPEN",
  })
  return [tunnel];
};
```
