# self-review r1 — has-pruned-yagni

> stone: 5.1.execution.from_vision
> guide: review for extras not prescribed by the vision/criteria. for each component ask —
> was this requested? is it the minimum viable satisfaction? did we add abstraction "for
> future flexibility" or features "while we're here"?

i walked every net-new component against the vision (`1.vision.yield.md`) and its
"complete resource inventory" + "decisions locked" tables. the verdict per component below.

---

## the method

the vision is unusually explicit about scope — it carries a numbered resource inventory
(9 nouns, 10 with the SNS sink), 5 locked decisions, and a parity table vs
`ahbode/svc-notifications`. so the YAGNI test here is sharp: does each component trace to a
row in that inventory / a locked decision, or did i add it "while i was here"?

---

## findings — each component traced

### 1. the 8-action receipt-rule union (s3|sns|lambda|bounce|stop|addHeader|workmail|connect)

**the biggest surface, and the sharpest YAGNI question.** the mail usecase only ever uses
the `s3` action (dogfood + acceptance both declare only s3). the other 7 actions — and
especially `workmail`/`connect` — are never exercised.

**it holds — it was explicitly prescribed.** the vision's input table for
`DeclaredAwsSesReceiptRule` reads: *"ordered `actions[]` from the **full native SES union**
(all 8 ...) ... the whole union is modeled for a faithful AWS mirror; `workmail`/`connect`
are niche but included for parity."* this is a locked design intent, not a "while we're
here" addition. `rule.require.symmetry-with-peer-resources` + the vision's "faithful AWS
mirror" goal both pull toward the full union.

**BUT i am flagging it as the top scope-trim candidate for the end-of-road council** — if
the wisher later prefers a minimal-union (s3 + sns + lambda, the three the mail domain
plausibly touches), a drop of the other 5 action DomainLiterals is a CLEAN rework (delete 5
files + 5 nested keys; the wrapper's "exactly one non-null" invariant is unaffected). i did
NOT best-guess a trim because the vision's language is a direct instruction to model all 8.

### 2. `workmail`/`connect` action literals specifically — same as (1)

niche, never used by mail. holds for the identical reason: vision says "included for
parity." same clean-rework offer.

### 3. lifecycle three-mode model (persist | staircase | auto-tier)

the dogfood + acceptance only exercise the STAIRCASE mode. persist (null) and auto-tier
(`INTELLIGENT_TIERING`) are modeled but not dogfooded.

**holds — locked decision #4.** the vision: *"the `DeclaredAwsS3Bucket` lifecycle config
must model both shapes"* (staircase + auto-tier), with persist = null. not speculative;
a prescribed per-consumer selection.

### 4. `mailFrom` optional field on `DeclaredAwsSesEmailIdentity`

declared but every consumer (dogfood + acceptance) passes `null`. never exercised live.

**holds — inventory "two subtle correctness details" #2:** *"a custom MAIL FROM domain is
required for strict SPF/DMARC alignment ... modeled as an optional `mailFrom` field."* it
is prescribed, and it is genuinely optional (null is the common v1 path). not YAGNI.

### 5. the standalone `DeclaredAwsSnsTopic` in the acceptance set

i added a standalone SNS topic to the acceptance `getResources()` that no other acceptance
resource references (the event destination uses a CLOUDWATCH sink, not this topic).

**holds — but by a DIFFERENT rule than the vision inventory.** `DeclaredAwsSnsTopic` is a
net-new declared resource (vision parity table, row 11), and
`rule.require.dao-and-acceptance-per-declared-resource` MANDATES acceptance coverage for
every declared resource. a standalone topic is the minimum viable way to prove the SnsTopic
DAO's create/KEEP through the CLI without a drag-in of the SES→SNS publish-policy complexity
(which the cloudwatch sink avoids — see finding 6). so it is required coverage, not a
"while we're here" extra.

### 6. cloudwatch sink (not sns sink) for the acceptance event destination

**this is a YAGNI-aligned SUBTRACTION, not an addition** — worth noting as evidence i
pruned rather than piled on. i deliberately did NOT wire the acceptance event destination
to the SNS topic (which would need an SES→SNS topic-publish policy + more setup). the
cloudwatch sink is the minimum that proves the EventDestination DAO. the sns-sink path is
type-covered by the standalone topic + the domain-object shape. this is the pit-of-success
minimum.

### 7. no speculative abstractions introduced

i checked for invented indirection beyond the proven per-resource template
(`castInto`/`getOne`/`set`/`del` + sdk wrappers + DAO). the one non-obvious shared type —
`ReceiptRuleResolved` (the sdk-layer boundary shape) — is not speculative: it de-duplicates
the ref↔arn conversion shared by the put builder + the get parser (a real DRY need with 2
call sites, not a rule-of-three speculation). holds.

---

## conclusion

**0 unprescribed extras found.** every net-new component traces to a vision inventory row,
a locked decision, or a mandating rule (dao-and-acceptance). the largest surface — the full
8-action receipt union — is a deliberate, vision-sanctioned "faithful AWS mirror" choice,
already flagged (fulcrum c-adjacent) with a clean-rework offer for the end-of-road council
should the wisher prefer a minimal union. i also actively pruned in one place (cloudwatch
over sns sink in acceptance) to keep coverage minimal.

no fix needed; the surface is prescribed, not padded.
