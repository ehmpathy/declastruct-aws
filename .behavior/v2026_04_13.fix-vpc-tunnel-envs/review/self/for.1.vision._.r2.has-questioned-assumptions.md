# self-review r2: has-questioned-assumptions

## deeper look with fresh eyes

### 7. "environment = account = stage"

**what do we assume?** that STAGE env var maps 1:1 to AWS account.

**what evidence?** the wish shows dev=account874711128849, prod=account398838478359

**what if the opposite were true?** what if:
- multiple stages share one account (prep + prod in same account)
- one stage spans multiple accounts (multi-region deployment)

**did the wisher actually say this?** yes — the table shows 1:1 mapping for THIS setup

**counterexamples**:
- some orgs use same account for prep+prod with different VPCs
- some orgs use prep in dev account to save costs

**conclusion**: **potential issue** — our fix assumes account=stage. if someone runs `STAGE=prep` in the prod account, our fix wouldn't help.

**action needed**: clarify in vision that account-based differentiation only works when each stage has its own account.

---

### 8. "context.aws.credentials.account is set correctly"

**what do we assume?** that when user runs STAGE=dev, the AWS credentials point to the dev account.

**what evidence?** none — we haven't verified this

**what if the opposite were true?** if credentials are cached or default to prod:
- user runs STAGE=dev
- but AWS_PROFILE still points to prod
- context.aws.credentials.account = prod account
- hash uses prod account
- finds prod cache file
- returns "in sync" because credentials say prod!

**did the wisher actually say this?** no — the wish focuses on resource identity, not credentials

**conclusion**: **possible root cause** — the bug might be a credentials mismatch, not an identity mismatch.

**action needed**: add to open questions — verify credentials match STAGE

---

### 9. "the symptom is reproducible now"

**what do we assume?** that the bug still occurs and can be reproduced.

**what evidence?** the wish describes the bug, but we haven't reproduced it

**what if the opposite were true?** what if:
- the bug was already partially fixed
- the bug only happens under specific conditions
- the bug is intermittent

**conclusion**: minor — wisher wouldn't file a wish for a fixed bug. but reproduction is needed.

---

### 10. "the problem only affects VpcTunnel"

**what do we assume?** that other Declared* resources (RdsCluster, Ec2Instance) don't have this issue.

**what evidence?** the wish only mentions VpcTunnel

**what if the opposite were true?** if RdsCluster uses `{ name: 'ahbodedb' }` without account, it could have the same problem.

**did the wisher actually say this?** no — focused on tunnel

**conclusion**: **needs investigation** — check if other resources have account in their unique keys

**action needed**: after fix, audit other Declared* resources for same pattern

---

### 11. "declastruct comparison uses domain object's unique keys"

**what do we assume?** that declastruct's core "is this in sync?" check uses `DeclaredAwsVpcTunnel.unique`.

**what evidence?** inference from domain-objects pattern

**what if the opposite were true?** declastruct might:
- use full object equality
- use a custom comparison function
- use the DAO's get response directly

**conclusion**: **needs research** — we assumed without verification. the fix approach depends on how declastruct compares.

**action needed**: research declastruct core to understand comparison mechanism

---

## summary of r2 findings

| new assumption | verdict | action |
|----------------|---------|--------|
| environment = account = stage | needs caveat | clarify scope in vision |
| credentials set correctly | **possible root cause** | add to investigation |
| symptom reproducible | likely valid | reproduction needed |
| only affects VpcTunnel | needs investigation | audit other resources |
| declastruct uses unique keys | needs research | check declastruct core |

## critical insight

**the credentials mismatch hypothesis deserves more weight**:

if user runs:
```sh
AWS_PROFILE=prod STAGE=dev ./use.vpc.tunnel.ts
```

then:
- config returns dev port (15432)
- but AWS credentials return prod account
- hash = sha256(prod_account + dev_port + ...)
- this is a NEW unique combination (never seen before)
- should create new tunnel, not "in sync"

so credentials mismatch alone doesn't explain "in sync".

but what if:
```sh
# first run: establish prod tunnel
AWS_PROFILE=prod STAGE=prod ./use.vpc.tunnel.ts
# tunnel opens on port 15433

# second run: try to open dev, but forget to change profile
AWS_PROFILE=prod STAGE=dev ./use.vpc.tunnel.ts
# config returns port 15432
# credentials say prod account
# hash = prod_account + port_15432
# no cache file for this hash
# should try to open new tunnel on port 15432
# BUT: port 15432 might be unused, so new tunnel starts
# this isn't "in sync" — this is "opened wrong tunnel"
```

hmm, the "in sync" message still doesn't fit. unless... the ports are the same?

**new hypothesis**: what if config.database.tunnel.local.port is the SAME for both stages, and only the remote cluster differs?

---

## what definitely holds

1. the mismatch between `getTunnelHash` (includes account) and `unique` (excludes account) is real
2. the logical name ambiguity is real
3. the need for validation before implementation is real
4. the three options are viable approaches

## what needs validation before we proceed

1. **reproduce the exact bug** with actual commands and output
2. **verify config ports** — are they truly different per stage?
3. **verify credentials** — does STAGE automatically set AWS_PROFILE?
4. **research declastruct core** — how does it decide "in sync"?
