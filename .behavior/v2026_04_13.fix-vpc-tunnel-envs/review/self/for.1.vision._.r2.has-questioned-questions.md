# self-review r2: has-questioned-questions

## triage of open questions

### 1. "where exactly does the false 'in sync' come from?"

**can we answer via logic now?** partially — from declastruct docs:
- declastruct calls `dao.get.one.byUnique(ref, context)` to get remote state
- compares remote state vs desired state
- if remote matches desired, it reports KEEP (in sync)
- if remote is null, it reports CREATE

the DAO's `getVpcTunnel` uses `getTunnelHash(ref, context)` which includes account.

**so the question becomes**: is `context.aws.credentials.account` correct when the DAO is called?

**verdict**: [research] — need to trace the context flow in plan/apply

---

### 2. "why doesn't the port difference already differentiate them?"

**can we answer via logic now?** yes — if ports are truly different (15432 vs 15433):
- `from.port` is part of `unique`
- declastruct uses unique ref for comparison
- different ports = different unique refs = different resources

the symptom "in sync" with different ports doesn't make sense unless:
1. config returns the SAME port for both stages
2. declastruct isn't use the full unique ref
3. the comparison happens at a layer that ignores `from`

**verdict**: [research] — verify config returns correct ports per stage

---

### 3. "is the config correct?"

**can we answer via extant code now?** not in this repo — getConfig lives in declapract-typescript-ehmpathy

**verdict**: [research] — check getConfig in consumer repo

---

### 4. "how declastruct compares current vs desired state"

**can we answer via extant docs now?** yes, from declastruct readme:
- calls `dao.get.one.byUnique(ref, context)` to fetch remote state
- compares remote vs desired
- uses domain-object's `unique` keys for the ref

the comparison is done by declastruct core, not the DAO. the DAO just fetches by unique ref.

**verdict**: [answered] — declastruct uses unique ref via DAO, then compares full objects

---

### 5. "whether an add of fields to unique is a break"

**can we answer via logic now?** yes:
- an add of a field to `unique` changes the ref shape
- callers that pass `RefByUnique` would need to include the new field
- this is a breakage for users who hardcode refs

**verdict**: [answered] — yes, a new field in `unique` causes breakage

---

### 6. "confirm the exact scenario that produces 'in sync' false positive"

**can we answer now?** no — requires reproduction with the wisher

**verdict**: [wisher] — need exact commands and output

---

### 7. "confirm whether tunnels should coexist or be mutually exclusive"

**can we answer now?** can infer from the wish table that shows different ports — parallel is intended

**verdict**: [answered] — parallel coexistence is the goal (different ports per stage)

---

### 8. "confirm preferred option (explicit account vs context-aware vs lookup id)"

**can we answer now?** no — this is a design decision for the wisher

**verdict**: [wisher] — need preference input

---

## summary table

| # | question | verdict | notes |
|---|----------|---------|-------|
| 1 | where does "in sync" come from | [research] | trace context flow |
| 2 | why doesn't port differ? | [research] | verify config |
| 3 | is config correct? | [research] | check consumer repo |
| 4 | how does declastruct compare | [answered] | uses unique ref via DAO, then compares objects |
| 5 | is add to unique a break | [answered] | yes, causes breakage |
| 6 | exact scenario | [wisher] | need reproduction steps |
| 7 | coexist vs exclusive | [answered] | parallel, different ports |
| 8 | preferred option | [wisher] | design decision |

## actions needed

### vision updates required

the open questions section should be updated with verdicts:

```markdown
### what questions remain unanswered?

1. **where does the false "in sync" come from?** [research]
   - need to trace context.aws.credentials.account flow in plan/apply

2. **why doesn't the port difference differentiate them?** [research]
   - need to verify config returns correct ports per STAGE

3. **is the config correct?** [research]
   - need to check getConfig in consumer repo (declapract-typescript-ehmpathy)

### what was answered?

4. **how does declastruct compare state?** [answered]
   - calls dao.get.one.byUnique(ref, context) to fetch remote
   - compares remote vs desired as full objects
   - uses domain-object's unique keys for the ref

5. **is a new unique field a break?** [answered]
   - yes, an add of fields to unique causes breakage

7. **should tunnels coexist?** [answered]
   - yes, parallel coexistence with different ports per stage

### what requires wisher input?

6. **exact scenario** [wisher]
   - need exact commands and output that show the false positive

8. **preferred fix option** [wisher]
   - option 1 (explicit account) vs option 2 (context-aware) vs option 3 (lookup)
```
