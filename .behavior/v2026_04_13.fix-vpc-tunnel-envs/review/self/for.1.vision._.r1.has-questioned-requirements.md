# self-review: has-questioned-requirements

## requirements questioned

### 1. "root cause is that DeclaredAwsVpcTunnel.unique doesn't include account"

**who said this?** the wish document states it directly.

**what evidence supports this?**
- the wish says "the root cause is in declastruct-aws — the DeclaredAwsVpcTunnel resource identity doesn't include stage differentiation"
- `DeclaredAwsVpcTunnel.unique = ['via', 'into', 'from']` — no account field

**what if we didn't do this?** users would continue to get false "in sync" positives

**issue found: this may not be the root cause**

looked at the code:
- `getTunnelHash` already includes account, region, via, into, from
- the hash is used for cache file names: `${hash}.json`
- different accounts → different hashes → different cache files
- `getVpcTunnel` looks up by hash, so different accounts would have different lookups

so the tunnel operations themselves should work correctly. the "in sync" message must come from elsewhere.

**conclusion**: the assumption may be wrong. the root cause might be:
1. in declastruct core (parent library), not declastruct-aws
2. in how the config loads the port
3. elsewhere entirely

**action**: noted in vision as open question, needs validation before we implement

---

### 2. "ports are different (15432 vs 15433)"

**who said this?** the wish document shows the table with different ports.

**what evidence?**
- wish shows: dev port 15432, prod port 15433
- `from.port` IS part of `unique`

**issue found: if ports differ, why "in sync"?**

if the ports are truly different:
- dev unique key includes `from.port = 15432`
- prod unique key includes `from.port = 15433`
- these are DIFFERENT unique keys
- declastruct should NOT say "in sync"

possibilities:
1. config isn't loaded with correct port for STAGE=dev
2. the "in sync" compares other attributes (not unique keys)
3. the "in sync" is a red flag — maybe it's not literally those words

**conclusion**: this needs validation. the symptom doesn't match the stated root cause.

**action**: noted in vision open questions — need to confirm exact scenario

---

### 3. "option 2 (context-aware comparison) is recommended"

**who said this?** the vision document (me, just now)

**what if we didn't do this?** option 1 (explicit account) or option 3 (lookup) might be better

**questioned the recommendation:**

- option 2 assumes declastruct core needs to change
- but if `getTunnelHash` already works correctly, maybe no change needed
- or the fix is simpler than expected

**conclusion**: recommendation is premature. we need to:
1. reproduce the exact "in sync" scenario
2. trace where the false positive originates
3. then determine the minimal fix

**action**: noted in vision — validate root cause before we implement

---

## summary of findings

| requirement | verdict | notes |
|-------------|---------|-------|
| unique doesn't include account | **needs validation** | `getTunnelHash` already includes it — mismatch suspicious |
| ports differ | **needs validation** | if true, unique keys should differ — symptom doesn't match |
| option 2 recommended | **premature** | need to find actual root cause first |

## what holds

| aspect | why it holds |
|--------|--------------|
| parallel tunnels usecase | users do want dev+prod to coexist |
| logical name ambiguity | `ahbodedb` does mean different clusters per account |
| mismatch between hash and unique | this is real — `getTunnelHash` vs `unique` diverge |

## next steps

before we proceed to criteria, we should:
1. ask wisher to reproduce the exact "in sync" scenario
2. add log capture to trace where the comparison happens
3. validate whether the config loads correct ports per stage
