# rule.require.declarative-test-infra

## .what

test environments must be provisioned via declared resources (`DeclaredAwsX` +
`setX` / declastruct apply), not hand-rolled imperative AWS sdk calls.

if a test needs infrastructure, declare it the same way a user would — then the
test setup just ensures that declared infra is in the desired state.

## .why

this repo IS a declarative provision tool. every test that hand-rolls
infrastructure with raw sdk calls is a usecase we fail to dogfood.

dogfood catches real defects:
- if our own tests cannot provision a NAT instance declaratively, neither can a
  user — the gap stays hidden until they hit it
- declared resources get idempotency, drift detection, and cleanup for free;
  imperative scaffold reinvents all three, badly

imperative test scaffold rots into fragility:
- hand-rolled idempotency keys (hour-bucketed hashes, ClientToken churn)
  cause `IdempotentParameterMismatch` whenever params change
- eventual-consistency races (`InvalidInstanceID.NotFound`, public-IP assign
  delay) must be re-handled at every call site
- self-destruct timers and orphan cleanup duplicate what declastruct does
- each raw `RunInstances` / `CreateRoute` / `ModifyInstanceAttribute` is one more
  codepath the declared path never exercises

a real incident: the ephemeral NAT was scaffolded with imperative
`RunInstancesCommand`. it accumulated bespoke handlers for public-IP delay,
ClientToken idempotency, NotFound races, and dynamic-interface masquerade — each
a defect surfaced one slow 10-minute integration run at a time. a declared NAT
instance + declared `instanceNat` route would have sidestepped every one, AND
dogfooded the exact path a user takes.

## .pattern

### 👎 bad — imperative scaffold

```typescript
// test setup hand-rolls infra with raw sdk
const ec2 = new EC2Client({ region });
const response = await ec2.send(
  new RunInstancesCommand({
    ImageId, InstanceType,
    ClientToken: asHashSha256(`nat:v4:${purpose}:${hour}`).slice(0, 64), // bespoke idempotency
    NetworkInterfaces: [{ AssociatePublicIpAddress: true, ... }],
    UserData: Buffer.from(NAT_USER_DATA).toString('base64'),
  }),
);
// ...then manual DescribeInstances NotFound-race handler, ModifyInstanceAttribute,
//    CreateRoute, 90-min self-destruct user-data, orphan cleanup, etc.
```

### 👍 good — declared resources

```typescript
// declare the infra exactly as a user would (in resources.acceptance.ts)
const natTemplate = DeclaredAwsEc2LaunchTemplate.as({
  exid: 'declastruct-acceptance-nat-template',
  imageId, instanceType: 't3.micro',
  iamInstanceProfile: ec2InstanceProfile,
  userData: NAT_USER_DATA,
  ...
});
const nat = DeclaredAwsEc2Instance.as({
  exid: 'declastruct-acceptance-nat',
  template: natTemplate,
  subnet: subnetPublic,
  associatePublicIp: true,
  sourceDestCheck: false,
  ...
});
routeTablePrivate.routes = [
  { destination: { cidr: { v4: '0.0.0.0/0' } }, target: { instanceNat: nat } },
];

// test setup just ensures it is active
await setEc2InstanceSession(
  { session: DeclaredAwsEc2InstanceSession.as({ instance: { id: nat.id }, status: 'active' }) },
  context,
);
```

## .when

applies to integration and acceptance test environment setup that creates AWS
resources (instances, templates, routes, security groups, profiles, etc.).

## .escape hatch

if the declared path genuinely cannot express what the test needs, that is a
**gap in our domain model, not a license to go imperative**. the correct response:

1. extend the `DeclaredAwsX` domain object + its `setX` to support it
2. then use the declared path

the imperative workaround is the bug report; closure of the model gap is the fix.
this is how dogfood drives the product forward.

## .enforcement

- raw `RunInstancesCommand` / `CreateRouteCommand` / `ModifyInstanceAttributeCommand`
  (and peers) in test setup = blocker
- bespoke idempotency keys / self-destruct timers in test scaffold = blocker
- a declarable resource set up imperatively = blocker

## .see also

- `rule.forbid.public-ip-on-subnets` — NAT instance gets public IP at the
  instance/NIC level, not the subnet
- `rule.require.acceptance-tests-for-resources` — declared resources also need
  acceptance coverage
- `howto.dogfood-aws-resources` — the dogfood pattern for provision/
