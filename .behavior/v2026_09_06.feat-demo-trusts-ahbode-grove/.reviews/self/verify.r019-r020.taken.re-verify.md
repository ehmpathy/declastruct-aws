# 1.vision — .taken.by_self · the RE-VERIFY round · i006 r019–r020

**verdict: the architect returned 3 blockers · 2 nitpicks, and every one is mine. the ergonomist
returned 2 blockers · 1 nitpick, and every one grades a surface this artifact does not own.**

⇒ **two lanes, two opposite conclusions, and the split is the find.**

## 🔴 architect blocker.1 — I swept the SYMPTOM I had seen, never the CLASS the rule names

`rule.forbid.chronological-accretion` was already repaired once. this round it fired again on
**five sites I never looked at** — and the reason is mechanical:

| I grepped for | it matched | it missed |
|---|---|---|
| `round N` · `blocker N` · `review round` | the **step-time narration** smell | — |
| — | — | 🔴 **the append-over-revise smell**: *"this line first read X"* · *"an earlier draft said"* · *"this bullet read Y until"* |

⚠️ **the rule's own smell table lists those as SEPARATE rows.** I read the table, swept one row, and
graded the rule satisfied. ⇒ **a sweep keyed on the instances a reviewer showed you is a sweep of the
reviewer's examples, never of the rule.**

🔴 **and this is the sequence defect again — instance six.** the earlier five were *"I fixed the file
the point named and not its peer."* this one is *"I fixed the FORM the point showed and not its peer
form."* **the same partial sweep, one level of abstraction up.**

⇒ **the mechanical defense: derive the search set from the RULE's enumeration, never from the
point's examples.** where the rule lists four smells, the sweep owes four greps.

**the repair, and its bound.** thirteen sites across three files — `1.vision.yield.md`,
`…dimensions.md`, `case=1`, `case=4`, `case=7`. each restated as current truth, and **each keeps its
lesson**:

| the archaeology that went | the durable claim that stays |
|---|---|
| *"this line first read 'the grant is a trust policy'"* | *"that is the tidiest sentence available, and it is **false**"* — the section exists to refuse it |
| *"an earlier draft said the grid itself moves"* | **the grid does not move** — read the two grains as one and a certifiable product reads as uncertifiable |
| *"this paragraph named row 16 until row 16 was answered"* | **a queue's head is a derived claim; re-derive it whenever a row leaves.** row 16 is the worked case |
| *"this paragraph read 'eight of the ten' until hunt AT"* | **a partition states a total AND a set of classes, and each goes stale independently** |
| *"the second reason is STRUCK"* | **a second reason is available here and must NOT be reached for** — it is unsound, and it inverts the rule it invokes |

⚠️ **and one repair fixed a structural bug the accretion had caused.** the artifact table's last row
sat orphaned from its header by a blank line — a paragraph had landed inside the table. ⇒
**accretion lands text where the author was, and that is not always a place text can go.** this is
the second such case, and both were in the same table.

## architect blockers 2–3, nitpicks 1–2 — **[REPAIR]**

- **the paragraph that opens the yield** was a ~45-word chain of five thoughts. now five sentences.
- **the `[tn]` sketch line** buried its claim under a parenthetical citation. claim first, citation
  after: *"the `[tn]` citations are sketches, never proofs. they say what a criterion means, never
  that it holds."*
- **the long sentences** the nitpick named — split at the second comma.
- **the passive constructions** — *"the whole grant is declared in files"* → **files declare the
  whole grant** · *"every one is reviewed in git"* → **git reviews every one** · *"a containment was
  stated as a property of AWS"* → **the vision stated a containment as a property of AWS**.

## 🔴 ergonomist r020 — **[REFUTE]** on all three, and the reason is structural

**the lane grades a SURFACE. the artifact is a DOCUMENT that describes one.**

⚠️ **the reviewer says so itself, in each of the three points:**

| point | its own words |
|---|---|
| blocker.1 | *"the document acknowledges the gap and parks it as an execution-stage obligation, but the described surface as it stands violates both rules"* |
| blocker.2 | *"the documents surface the collision and demand a two-artifact fix"* |
| nitpick.1 | the same region fail-fast r018 already raised |

⇒ **each point concedes the artifact carries the obligation, and grades the surface anyway.**

### 🔴 the tell: blocker.1 quotes text I ADDED to answer r018

r018 nitpick.3 asked the vision to surface the orphan silence. I added `case=1` `[t6]`'s new lines.
**r020 blocker.1 quotes those exact lines back as its evidence** — and raises the severity.

> **a repair re-raised at higher severity, cited from its own text, is the signature of a rubric
> pointed at a different subject.**

⇒ **so this lane cannot converge on this artifact.** the more faithfully the vision documents an
un-ergonomic surface it does not own, the more the ergonomics rubric fires. **to reach 0/0 I would
have to describe the surface less honestly**, which is the opposite of what a vision owes.

### the scope evidence, per point

| the graded surface | who owns it |
|---|---|
| `sts:AssumeRole`'s `AccessDenied` text | **AWS.** not one byte is ours |
| jest's teardown on a dead credential | **this repo's suite** — out of the wish's bounds. raised at exec-owes row 17, per `rule.require.experience-catalog-evolution`'s own caveat |
| `getDeclastructAwsProvider.ts:220-227`'s region fail-fast | **this repo's `src/`** — the wish bars `src/` changes. recorded at exec-owes row 15 |

⚠️ **and nitpick.1 stays refuted on the merits, never merely on scope.** a defaulted region is a
**surprise**: a provisioner that silently targets `us-east-1` applies real infrastructure to the
wrong place. `rule.require.safe-by-default` outranks `defaults-match-common-case` where they collide.

### what the lane DID buy, and it was a great deal

⇒ **r018's four points were real and four repairs landed** — F2's second criterion, `[t3'''']`'s
declaration-site note, and exec-owes rows 15/16/17. **the lane is terminal at its useful state**,
never broken and never ignored.

## the lesson

🔴 **a lane that re-raises its own answered points is not a lane with more to say — it is a lane
whose rubric has run out of reach.** the honest read is neither *"keep the round-trips going"* nor
*"malfunction"*: it is **converged**, with the residual named and owned elsewhere.

⚠️ **and the two lanes had to be judged separately, on the same day, on the same artifact.** the
architect's rubric grades **prose**, and a yield IS prose — so its every point was mine to fix. the
ergonomist's grades **a surface**, and this artifact only describes one. ⇒ **a role's verdict binds
only as far as its subject matches yours**, and that match is the driver's to check.

## .see also

- `…r017-r018._.taken.by_self.other-roles.md` — the round that found the four real ergonomist points
- `…r010._.taken.by_self.dimensional-decomposition.md` — the behaver-lane blocker and its repair
