# self-review: has-critical-paths-frictionless (round 8)

## the question

are the critical paths frictionless in practice?

## step 1: identify critical paths

the guide says to look at repros artifact:
```
.behavior/v2026_04_13.fix-vpc-tunnel-envs/3.2.distill.repros.experience.*.md
```

no repros artifact exists for this behavior.

but the vision (1.vision.stone) describes the critical path:

> a developer:
> 1. runs `STAGE=dev ./.agent/repo=.this/skills/use.vpc.tunnel.ts`
> 2. tunnel opens to the dev database cluster on port 15432
> 3. later, they need to check production
> 4. runs `STAGE=prod ./.agent/repo=.this/skills/use.vpc.tunnel.ts` in another terminal
> 5. tunnel opens to the prod database cluster on port 15433
> 6. both tunnels coexist — dev on 15432, prod on 15433
> 7. declastruct correctly identifies each as a distinct resource

## step 2: can i run this path manually?

**no.** this is an infrastructure library. the critical path requires:
- real aws credentials
- real bastion instance per environment
- real rds cluster per environment
- configured vpc tunnel in consumer repo

i cannot run the path in this repo. the consumer (declapract-typescript-ehmpathy) must invoke it.

## step 3: what can i verify?

the mechanics that enable the path:

| step | mechanic | verification |
|------|----------|--------------|
| tunnel opens to dev | setVpcTunnel uses account/region | unit tests pass |
| tunnel opens to prod | setVpcTunnel uses account/region | unit tests pass |
| both coexist | different account/region → different hash | getTunnelHash.test.ts:79-161 |
| distinct resources | unique keys include account, region | DeclaredAwsVpcTunnel.test.ts:63-66 |

## step 4: walk through the mechanics

### 4.1: different account → different hash

from `getTunnelHash.test.ts`:
```ts
given('[case2] same tunnel via/into/from with different account', () => {
  when('[t0] we compute the hash for each', () => {
    // hash1 = account '111111111111'
    // hash2 = account '222222222222'
    then('[t1] the hashes should be different', () => {
      expect(hash1).not.toBe(hash2);
    });
  });
});
```

this ensures dev tunnel (account 874711128849) and prod tunnel (account 398838478359) produce different hashes → different cache files → both can coexist.

### 4.2: different region → different hash

from `getTunnelHash.test.ts`:
```ts
given('[case3] same tunnel via/into/from with different region', () => {
  // hash1 = region 'us-east-1'
  // hash2 = region 'us-west-2'
  then('[t1] the hashes should be different', () => {
    expect(hash1).not.toBe(hash2);
  });
});
```

even if accounts match, different regions produce different tunnels.

### 4.3: unique keys include account and region

from `DeclaredAwsVpcTunnel.test.ts`:
```ts
then('unique is defined as account, region, via, into, from', () => {
  expect(DeclaredAwsVpcTunnel.unique).toEqual([
    'account',
    'region',
    'via',
    'into',
    'from',
  ]);
});
```

this ensures declastruct identifies them as distinct domain objects.

## step 5: friction assessment

### frictionless?

the mechanics are frictionless:
1. consumer passes account and region (required fields now)
2. hash computation is automatic
3. cache file separation is automatic
4. coexistence is automatic

### potential friction discovered?

**yes — consumer update required.**

the consumer (declapract-typescript-ehmpathy) must update `use.vpc.tunnel.ts` to pass account and region. without this update, typescript will error (new required fields).

this is intentional friction — the type system forces consumers to provide the new fields.

## conclusion

| critical path step | frictionless? | evidence |
|--------------------|---------------|----------|
| dev tunnel opens | cannot test (needs aws) | mechanics verified |
| prod tunnel opens | cannot test (needs aws) | mechanics verified |
| both coexist | ✓ different hash | test: getTunnelHash.test.ts |
| distinct resources | ✓ unique keys | test: DeclaredAwsVpcTunnel.test.ts |

**found:** the critical path cannot be run manually in this repo, but the mechanics that enable it are verified via unit tests. consumer must update to pass account/region (intentional).

## step 6: question my assumptions

### am i certain the mechanics work end-to-end?

i verified:
- getTunnelHash produces different hashes for different account/region
- DeclaredAwsVpcTunnel.unique includes account and region

but i did NOT verify:
- the hash is actually used as the cache file name
- setVpcTunnel actually passes account/region to getTunnelHash

let me trace the code path.

### trace: setVpcTunnel → getTunnelHash (actual code read)

from `setVpcTunnel.ts:39-40`:
```ts
const tunnelHash = getTunnelHash({ for: { tunnel: input } });
const cachePath = path.join(tunnelsDir, `${tunnelHash}.json`);
```

from `getTunnelHash.ts:15-27`:
```ts
const serialized = serialize(
  JSON.parse(
    JSON.stringify({
      account: input.for.tunnel.account,   // <-- account explicitly included
      region: input.for.tunnel.region,     // <-- region explicitly included
      via: input.for.tunnel.via,
      into: input.for.tunnel.into,
      from: input.for.tunnel.from,
      _v: 'v2025_11_27',
    }),
  ),
);
```

the flow (verified via source code):
1. `setVpcTunnel` receives `DeclaredAwsVpcTunnel` input with account/region
2. line 39: calls `getTunnelHash({ for: { tunnel: input } })`
3. `getTunnelHash` explicitly extracts `account` and `region` (lines 19-20)
4. serializes and hashes
5. line 40: uses hash for cache file path

**verified via actual source:** account and region are explicitly included in the hash computation. different account/region → different hash → different cache file → tunnels coexist.

### what could cause friction i haven't considered?

1. **cache file collision?** — no, different hash = different file
2. **pid file collision?** — let me check...

from `setVpcTunnel.ts`:
```ts
const pidCacheFileFor = join(os.homedir(), '.declastruct', `vpc-tunnel.${hash}.pid`);
const statusCacheFileFor = join(os.homedir(), '.declastruct', `vpc-tunnel.${hash}.status`);
```

**verified:** pid and status files both use the hash. no collision.

3. **port collision?** — this is NOT handled by this library. the consumer must configure different ports per environment. this is expected — port is part of the tunnel spec, not computed.

### is the port friction acceptable?

the consumer already specifies different ports:
- dev: 15432
- prod: 15433

this is configuration, not friction. the library doesn't need to handle it.

## what i learned

1. the mechanics chain correctly from input through to cache file
2. account/region inclusion in hash prevents cache collision
3. port configuration is consumer responsibility (as designed)
4. the only friction is type system enforcement of new required fields

## conclusion

✓ mechanics are frictionless once consumer provides account/region
✓ code path traced: input → getTunnelHash → unique keys → hash → cache file
✓ no unexpected errors in test suite
✓ friction is intentional (required fields)
✓ port configuration is consumer responsibility (as designed)
