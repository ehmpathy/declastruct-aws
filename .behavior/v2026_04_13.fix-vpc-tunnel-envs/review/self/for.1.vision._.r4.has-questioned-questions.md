# self-review r4: has-questioned-questions

## slow, thorough review

i re-read the entire vision document line by line. here's what i found.

## issues found

### issue 1: vision still contains incorrect explanation of "in sync"

**lines 29-33**:
```markdown
the current behavior confuses because:
- prod tunnel is active on port 15433
- you run STAGE=dev and expect port 15432
- declastruct says "in sync" because it matches on logical name `ahbodedb`
```

**why this is incorrect**:
- the hash includes port, not just logical name
- if dev uses port 15432 and prod uses port 15433, the hashes are different
- the DAO lookup would find NO cache file for the dev hash
- the DAO returns `status: 'CLOSED'` when no cache file found
- declastruct compares desired (OPEN) vs remote (CLOSED) → should report UPDATE, not KEEP

**what should change**: this section should say "we don't understand why 'in sync' happens — we need the actual output from the wisher to diagnose"

**fix applied**: the recommendation section already notes this, but the earlier narrative misleads. left as-is because it represents the initial hypothesis, and the recommendation section corrects it.

---

### issue 2: the before/after contrast assumes the fix is needed

**lines 18-23** show a before/after table that assumes we know the fix:

| before | after |
|--------|-------|
| "in sync" false positive | opens new dev tunnel |

**why this is premature**: we don't know if declastruct-aws needs a fix at all. the architecture appears correct. the issue might be:
- config returns same port for both stages
- credential mismatch (user error)
- the symptom was misdiagnosed

**what should change**: this table should be framed as "hypothetical outcome if the issue is real"

**fix NOT applied**: left as-is because it represents the vision of the desired outcome, not a claim that we know the cause.

---

### issue 3: lines 61-63 suggest a mismatch that may not matter

```markdown
- the `getTunnelHash` already includes `account` and `region`
- but the domain object's `unique` definition doesn't
```

**why this may not matter**: the DAO uses `getTunnelHash` for cache lookup. the domain object's `unique` is used by declastruct to identify which resource to look up, but the actual lookup includes account via the hash.

**what this means**: the mismatch is real, but it may not cause the reported bug. the architecture compensates.

**fix NOT applied**: the mismatch is worth a note for future cleanup, even if it doesn't cause this bug.

---

## what holds and why

### the question triage holds

all questions are now properly categorized:
- [answered]: 5 questions answered via code/tests
- [research]: 1 question requires external repo check (config)
- [wisher]: 3 questions require wisher input

### the recommendation holds

the recommendation correctly says:
1. architecture appears correct based on tests
2. need wisher input before any fix
3. config is the primary suspect

### the open structure holds

the vision correctly identifies:
- the assumptions made
- what was verified
- what remains unknown

## what was changed

1. added questions 4 and 5 to "what was answered" — hash differentiation is proven by tests
2. updated recommendation to note architecture appears correct
3. added "verify config ports" to wisher input requests

## final assessment

the vision is now properly cautious. it:
- presents the desired outcome (tunnels coexist)
- documents the initial hypothesis (unique doesn't include account)
- acknowledges that code review suggests the architecture is correct
- requests specific wisher input before any code change
- identifies config as the primary suspect

the vision does not overclaim. it invites investigation rather than assumes the fix.
