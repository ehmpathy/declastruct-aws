# self-review: has-questioned-assumptions

## hidden assumptions surfaced

### 1. "the 'in sync' message is the exact symptom"

**what do we assume?** that declastruct literally says "in sync" when the bug occurs.

**what evidence supports this?** the wish says "declastruct saw it and said 'in sync' without a check of stage"

**what if the opposite were true?** the output might say different words — "no changes", "up to date", etc.

**did the wisher actually say this?** yes, but it's quoted paraphrase, not verbatim output

**conclusion**: minor — the symptom is false positive "no action needed" regardless of exact phrasing

---

### 2. "the issue is in identity comparison"

**what do we assume?** that declastruct compares resources and concludes they're equal when they shouldn't be.

**what evidence?** none directly — this is inference from the symptom.

**what if the opposite were true?** maybe the issue is:
- the subprocess health check (sees prod tunnel alive on port 15433)
- the cache file lookup (shared across accounts somehow)
- the config (returns wrong port)

**did the wisher actually say this?** no — wisher said "resource identity doesn't include stage differentiation" which implies comparison, but doesn't specify where.

**conclusion**: **issue found** — we assumed identity comparison, but the root cause could be elsewhere (health check, cache, config).

**action**: added to open questions in vision

---

### 3. "users want multiple tunnels to coexist"

**what do we assume?** that the goal is dev tunnel on 15432 AND prod tunnel on 15433 at the same time.

**what evidence?** the wish describes both tunnels with different ports, which implies parallelism.

**what if the opposite were true?** maybe users want to SWITCH between envs, not run both. maybe port conflict is intentional to force exclusive access.

**did the wisher actually say this?** no — wisher focused on "create use.vpc.tunnel across different envs" which could mean serial, not parallel.

**conclusion**: minor — the vision supports both usecases. parallel is a superset of serial.

---

### 4. "the fix belongs in declastruct-aws"

**what do we assume?** that changes to this repo will solve the problem.

**what evidence?** the wish says "root cause is in declastruct-aws"

**what if the opposite were true?** what if:
- declastruct core needs changes (parent library)
- the user's getConfig() is buggy
- the use.vpc.tunnel.ts skill needs changes

**did the wisher actually say this?** yes — "root cause is in declastruct-aws"

**conclusion**: likely valid, but could be partial. the fix might span multiple repos.

---

### 5. "getConfig() returns different ports per stage"

**what do we assume?** that `config.database.tunnel.local.port` is 15432 for dev and 15433 for prod.

**what evidence?** the wish shows these ports in a table, and use.vpc.tunnel.ts uses config.

**what if the opposite were true?** what if getConfig() has a bug and returns the same port regardless of STAGE?

**did the wisher actually say this?** implicitly — the table shows different ports per env.

**conclusion**: **needs validation** — if config is broken, that's the root cause.

---

### 6. "the hash mechanism works correctly"

**what do we assume?** that `getTunnelHash` produces different hashes for different accounts.

**what evidence?** code review — it includes `context.aws.credentials.account` in the serialized data.

**what if the opposite were true?** what if:
- context.aws.credentials.account is undefined or wrong
- the serialization has a bug
- the hash collision rate is higher than expected

**did the wisher actually say this?** no — we discovered this in code review.

**conclusion**: likely valid — the code is clear. but worth a unit test to confirm.

---

## summary

| assumption | verdict | notes |
|------------|---------|-------|
| "in sync" is exact symptom | valid | exact phrasing doesn't matter |
| issue is identity comparison | **needs validation** | could be health check, cache, or config |
| users want parallel tunnels | valid | parallel is superset of serial |
| fix belongs in declastruct-aws | likely valid | may span repos |
| config returns different ports | **needs validation** | bug here would explain symptom |
| hash mechanism works | likely valid | code looks correct |

## what holds

the vision correctly identifies:
- the mismatch between `getTunnelHash` (includes account) and `unique` (excludes account)
- the logical name ambiguity problem
- three viable fix options
- the need for validation before implementation

## recommendations

before we proceed to criteria:
1. reproduce the bug and capture actual output
2. verify getConfig() returns correct ports per STAGE
3. trace where the "no action needed" decision originates
