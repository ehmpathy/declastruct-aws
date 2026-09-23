# F10 — the declaration-site rule that governs three new registers

**rework** · clean  ·  **status** · open  ·  **confidence** · 78%

## the fork, stated fairly

review round 5 added **three top-level registers** to the yield — the execution-owes table (15
rows), the cross-repo interface (9 rows), and the wish-contradictions table (6 rows) — because
blockers 86, 87, and 88 each found a KIND of item the vision produced with nowhere to put it.

each register gathers items that **already had a home** elsewhere in the document. so every gathered
row now sits in two places, which `rule.always.yield-the-output-not-the-archaeology` forbids outright:
*"declare each claim exactly once. a claim that belongs in two sections means one of the two is
redundant."*

⇒ the fork: **which site DECLARES, and which merely cites?**

| the option | what it costs |
|---|---|
| the **newest** table declares | one rule, trivially applied. but it inverts the natural home for any item the wish itself asked for |
| the **extant** site declares, always | preserves the document's shape. but then the registers hold no content and read as bare pointer lists, which is the shape 86–88 exist to replace |
| 🔴 **a test decides, per row** — the pick | one rule to state and to apply consistently. it gives **opposite** answers in different rows, which is a feature and a hazard both |

## taken, and why at the time

**the test: *is this item owed BECAUSE the other party needs it?*** — where "other party" is read at
whichever boundary the register is about:

| register | its boundary | so it declares when… |
|---|---|---|
| **cross-repo** | this org ↔ ahbode | the item is owed because **another org** needs it |
| **exec-owes** | vision ↔ execution stage | the item is a **vision-added** obligation, absent from the wish |
| **contradictions** | vision ↔ wish | the item is a **correction of a wish premise** |
| the extant tables (goals, who-can-prove, assumptions, cons) | — | the item is owed because the **wish** asked for it |

applied at **seven** rows so far: four to the cross-repo table (blocker 89), and three split
two-to-one the other way (blocker 90). those seven touch **six** sites — the exec-owes table, the
cross-repo table, the goals table, the assumptions table, the who-can-prove table, and a `pros`
bullet — so the rule already carries weight across most of the yield's tabular surface.

⇒ the split is the evidence the test does real work. a rule that always returned the same table
would be a preference dressed as a rule.

## why the confidence is 78%

three reasons it is under 93%, in order of weight:

1. 🔴 **the rule was invented in one hunt and applied minutes later.** it has not been read by anyone
   else, and it settles a question (*which of two true statements is authoritative?*) that has no
   obvious right answer.
2. **it is easy to misapply**, precisely because it gives opposite answers. a later author who adds a
   row and reaches for "the newest table declares" would invert two of the three round-5 rulings.
3. ⚠️ **the registers introduce a CITATION SHAPE** — *"declared at cross-repo row 2"*, *"exec-owes row
   15"* — that binds on an **ordinal**. rows are cited by number in four places already. a re-order
   silently breaks every citation, and no check catches it.

what holds it above a coin flip: the alternative rules are each demonstrably worse (option 1
inverts natural homes; option 2 empties the registers), and the test is stated once, in the yield,
where a later author will meet it.

## rework, and why it is clean

a register can be merged, split, re-pointed, or dropped with no caller hardened against it — this is
prose, and the criteria stage has not yet been written.

⚠️ **it hardens the moment the criteria stage cites a row by ordinal.** at that point a re-order is a
coordinated change across two stages, and the rework becomes dirty. ⇒ **if the ordinals are to become
stable, say so before criteria; if not, replace them with slugs.**

## where

`1.vision.yield.md` — three new `###` sections in `## evaluation`, plus cite-only edits at seven
sites across the goals, who-can-prove, assumptions, and cons tables.

## the verdict

_open._
