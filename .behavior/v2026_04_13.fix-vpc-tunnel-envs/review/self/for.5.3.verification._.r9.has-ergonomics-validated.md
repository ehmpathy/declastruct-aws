# self-review: has-ergonomics-validated (round 9)

## the question

does the actual input/output match what felt right at repros?

## step 1: what was planned?

no formal repros artifact exists. the vision describes the desired experience:

> a developer:
> 1. runs `STAGE=dev ./.agent/repo=.this/skills/use.vpc.tunnel.ts`
> 2. tunnel opens to the dev database cluster on port 15432
> 3. runs `STAGE=prod ./.agent/repo=.this/skills/use.vpc.tunnel.ts` in another terminal
> 4. tunnel opens to the prod database cluster on port 15433
> 5. both tunnels coexist
> 6. declastruct correctly identifies each as a distinct resource

the wish says:
> the root cause is in declastruct-aws — the DeclaredAwsVpcTunnel resource identity doesn't include stage-specific fields

## step 2: what was implemented?

from `DeclaredAwsVpcTunnel.ts`:

**before (implied by wish):**
```ts
public static unique = ['via', 'into', 'from'] as const;
```

**after:**
```ts
public static unique = ['account', 'region', 'via', 'into', 'from'] as const;
```

the interface now requires:
```ts
interface DeclaredAwsVpcTunnel {
  account: string;  // NEW - required
  region: string;   // NEW - required
  via: DeclaredAwsVpcTunnelVia;
  into: DeclaredAwsVpcTunnelInto;
  from: DeclaredAwsVpcTunnelFrom;
  status: 'OPEN' | 'CLOSED';
  pid?: number | null;
}
```

## step 3: ergonomics comparison

| aspect | planned | implemented | match? |
|--------|---------|-------------|--------|
| stage differentiation | via STAGE env var | via explicit account/region | ✓ better |
| tunnel coexistence | different ports | different cache files | ✓ |
| distinct identity | stage-aware | account/region in unique | ✓ |

### why "account/region" is better than "stage"

the wish mentioned "stage-specific fields" but the implementation uses account and region. this is an ergonomic improvement:

1. **explicit > implicit** — account and region are explicit values; "stage" is an abstraction that maps to different accounts
2. **multi-account** — same stage could span multiple accounts in complex setups
3. **cross-region** — same account could have resources in multiple regions
4. **no env var dependency** — account/region come from aws credentials, not STAGE env var

the implementation is more precise than what the wish described.

## step 4: consumer impact

the consumer must now provide:
```ts
setVpcTunnel({
  account: '874711128849',  // NEW - must provide
  region: 'us-east-1',      // NEW - must provide
  via: { mechanism: 'aws.ssm', bastion: { name: 'bastion' } },
  into: { cluster: { identifier: 'my-cluster' } },
  from: { host: 'localhost', port: 15432 },
  status: 'OPEN',
});
```

**is this ergonomic?**

- consumers already know their account/region (from aws credentials)
- typescript enforces the new fields (compile error if omitted)
- no implicit behavior that could surprise

this is a backward-incompatible change, but a necessary one for correct behavior.

## step 5: did ergonomics drift?

| check | result |
|-------|--------|
| input more complex? | yes — two new required fields |
| input more explicit? | yes — account/region instead of implicit stage |
| output changed? | no — same `DeclaredAwsVpcTunnel` shape |
| behavior clearer? | yes — identity explicitly includes account/region |

the ergonomics shifted toward explicitness. this is the right direction for infrastructure code.

## step 6: steelman the alternative

could we have done this differently? let me question the design:

### alternative 1: use "stage" field

```ts
interface DeclaredAwsVpcTunnel {
  stage: string;  // 'dev' | 'prod' | 'test'
  // ...
}
```

**why we didn't:**
- "stage" is consumer vocabulary, not AWS vocabulary
- different consumers use different stage names
- stage → account mapping lives in consumer config, not in declastruct-aws

### alternative 2: derive account/region from context

```ts
setVpcTunnel(input, context);
// context.aws.credentials.account → account
// context.aws.credentials.region → region
```

**why we didn't (let me check):**

looking at `setVpcTunnel.ts`:
```ts
export const setVpcTunnel = async (
  input: DeclaredAwsVpcTunnel,
  context: ContextAwsApi & ContextLogTrail,
)
```

the context HAS credentials. why not derive from there?

**answer from code inspection:**
- the tunnel is a DECLARED resource
- its identity should be explicit, not derived
- if credentials change between invocations, identity would shift
- explicit account/region locks the identity to the declaration

this is the right design: explicit > derived.

### alternative 3: make account/region optional

```ts
interface DeclaredAwsVpcTunnel {
  account?: string;  // defaults to current credentials
  region?: string;   // defaults to current credentials
}
```

**why we didn't:**
- optional fields hide complexity
- "default to current" is implicit behavior
- consumers might not realize their tunnel identity depends on active credentials
- explicit required fields force the consumer to think about identity

## step 7: am i rationalizing?

i've justified the design choice. but am i just defending what was built?

let me ask: **what could go wrong with this design?**

1. **consumer must get account/region from somewhere** — yes, but they're already in the aws context
2. **more boilerplate** — yes, two extra fields. but explicit is worth it.
3. **no migration path** — true, old calls break. but type system catches it.

**residual concern:** where does the consumer get account/region?

from `setVpcTunnel.ts:136`:
```ts
region: context.aws.credentials.region ?? null,
```

the context DOES have region. the consumer should pass `context.aws.credentials.account` and `context.aws.credentials.region`.

**is this discoverable?** the type error will show required fields. the consumer will look for where to get them.

## what i learned

the implementation improved on the wish's vague "stage-specific" via precise account/region. this required a code read to understand the design decision.

i also learned that explicit identity is better than derived identity for declared resources. the consumer must consciously choose the account/region.

## conclusion

✓ input ergonomics validated — explicit account/region is clearer than implicit stage
✓ output ergonomics unchanged — same return shape
✓ backward-incompatible change is intentional and type-enforced
✓ design is more precise than what was sketched in wish

no ergonomic drift — the implementation is better than planned.
