# self-review: has-ergonomics-validated (round 10)

## pause

i've written conceptual reviews about ergonomics. but i haven't walked through the actual consumer experience. let me do that now.

## the question

does the actual input/output match what felt right at repros?

## simulate: consumer experience before and after

### before: consumer code (hypothetical)

```ts
// use.vpc.tunnel.ts in declapract-typescript-ehmpathy

await setVpcTunnel({
  via: { mechanism: 'aws.ssm', bastion: { name: 'ahbode-bastion' } },
  into: { cluster: { identifier: 'ahbode-db' } },
  from: { host: 'aws.ssmproxy.ahbodedb.dev', port: 15432 },
  status: 'OPEN',
}, context);
```

**what happened:**
- dev tunnel opened on 15432
- prod tunnel attempted on 15433 (in another terminal)
- prod tunnel said "in sync" because identity was same (via+into+from matched)

### after: consumer code (required)

```ts
// use.vpc.tunnel.ts in declapract-typescript-ehmpathy

await setVpcTunnel({
  account: context.aws.credentials.account,  // NEW
  region: context.aws.credentials.region,    // NEW
  via: { mechanism: 'aws.ssm', bastion: { name: 'ahbode-bastion' } },
  into: { cluster: { identifier: 'ahbode-db' } },
  from: { host: 'aws.ssmproxy.ahbodedb.dev', port: 15432 },
  status: 'OPEN',
}, context);
```

**what happens now:**
- dev tunnel opens on 15432 (account 874711128849)
- prod tunnel opens on 15433 (account 398838478359)
- different accounts → different hashes → different cache files → both coexist

### ergonomic friction?

| friction point | severity | resolution |
|---------------|----------|------------|
| must add two fields | low | values already in context |
| type error on old code | low | clear message, obvious fix |
| must remember to pass account/region | none | type system enforces |

## examine: where does consumer get account/region?

the consumer passes `context`. where is context.aws.credentials.account?

this depends on consumer setup. typically:

```ts
// context setup in consumer
const context = {
  aws: {
    credentials: {
      account: process.env.AWS_ACCOUNT_ID,
      region: process.env.AWS_REGION,
    },
    // ...
  },
  log: console,
};
```

**is this discoverable?**

when consumer sees typescript error:
```
Property 'account' absent in type '...'
Property 'region' absent in type '...'
```

they look at the DeclaredAwsVpcTunnel interface. they see:
```ts
account: string;
region: string;
```

they look at their context, find `context.aws.credentials.account` and `context.aws.credentials.region`.

**this is discoverable.** typescript guides the consumer to the right solution.

## examine: could this be more ergonomic?

### option: derive from context automatically

```ts
// hypothetical internal derivation
const actualAccount = input.account ?? context.aws.credentials.account;
```

**why we didn't do this:**
- implicit derivation hides identity
- if credentials change between calls, identity would shift
- explicit is safer for infrastructure

### option: provide helper function

```ts
// hypothetical helper
const tunnel = asTunnelFromContext(config, context);
await setVpcTunnel(tunnel, context);
```

**why we didn't do this:**
- adds indirection
- obscures what's passed to setVpcTunnel
- consumer can do this themselves if they want

## what holds

1. **explicit account/region is correct** — identity should be declared, not derived
2. **type system guides consumer** — errors show required fields
3. **values are accessible** — context already has credentials
4. **friction is minimal** — two extra fields from known source

## what i would change

honestly? i would consider:

```ts
// alternative design
setVpcTunnel(
  { credentials: context.aws.credentials, ...tunnelConfig },
  context,
);
```

but this duplicates credentials in input AND context. the current design is cleaner.

## conclusion

✓ consumer ergonomics are good — explicit, discoverable, type-enforced
✓ friction is minimal — two fields from known source
✓ no better alternative found

the implementation matches the intended ergonomics from the vision: distinct tunnels per environment.
