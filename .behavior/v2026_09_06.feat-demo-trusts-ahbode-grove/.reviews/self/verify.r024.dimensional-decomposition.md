🦉 needs your talons
   ├─ logs: .log/bhrain/review/2026-09-08T07-51-42-159Z
   ├─ review: .behavior/v2026_09_06.feat-demo-trusts-ahbode-grove/.reviews/self/verify.r024.dimensional-decomposition.md
   └─ summary
      ├─ 1 blockers 🔴
      └─ 2 nitpicks 🟠

---
# blocker.1: Orthogonality of actor × stage cannot be confirmed — it is contingent on the unsettled F1 permission bound

**rule**: .agent/repo=bhuild/role=behaver/briefs/practices/behavior.vision/rule.require.dimensional-decomposition.md

**locations**:
- .behavior/v2026_09_06.feat-demo-trusts-ahbode-grove/1.vision.experience.dimensions.md
- .behavior/v2026_09_06.feat-demo-trusts-ahbode-grove/1.vision.experience.case=_.md

The rule's enforcement gate requires a peer reviewer to *confirm the dimensions are orthogonal + exhaustive* before the human approves, and its grading question asks: "does any value on one axis imply a value on another? if so ... the decomposition is not yet clean." The dimensions artifact itself refuses to certify this pair: the status table grades `actor × stage independence` as "provisional — contingent on F1", and the orthogonality table marks the actor × stage row "⚠️ yes, CONTINGENT on F1" because `grove-clone`/`rogue-process` can reach the `declare` stage *only because* the reused `demoPermissionsPolicy` bundle happens to carry `iam:` writes. If F1 settles toward a bundle with no `iam:` writes, those two actors are barred from `declare` in **all four** reach-states — a bar across an actor's entire row of a second axis, which the artifact itself names as "precisely the dependence orthogonality forbids." That is the exact row/column-collapse the rule's hidden-dimension check exists to catch. So today the reviewer cannot answer the first grading question, and the `1.vision` guard cannot pass. Credit is due that the contingency is surfaced, per-row pinned (9 rows in `case=_`), and carries a re-walk trigger — this is not a *hidden* non-orthogonality — but it is still an un-confirmed orthogonality, and the rule requires confirmation *before approval*, not deferral to a fulcrum. The decomposition must either be re-walked under a settled F1, or the re-walk of the 9 affected rows must be a hard precondition of this review pass.

**snippet**:
```markdown
| actor × stage | ⚠️ **yes, CONTINGENT on F1** | a provisioner obtains admin creds, acts under them, and declares. a `grove-clone` and a `rogue-process` can `declare` **only because the reused bundle carries `iam:` writes** — see below |
```

---

# nitpick.1: The `impossible` bar for {grove-clone, rogue-process} × act/declare × neither justifies the wrong half of the cell

**rule**: .agent/repo=bhuild/role=behaver/briefs/practices/behavior.vision/rule.require.dimensional-decomposition.md

**locations**:
- .behavior/v2026_09_06.feat-demo-trusts-ahbode-grove/1.vision.experience.case=_.md
- .behavior/v2026_09_06.feat-demo-trusts-ahbode-grove/1.vision.experience.dimensions.md

The rule requires each barred cell to state *why* it cannot occur. The census justifies all four `impossible` cells — `{grove-clone, rogue-process} × {act, declare} × neither` — with "our target role is absent, so no token can name an arn. there is no api call to make." That reason explains why **obtain** fails (no arn to name), but it is the wrong reason for **act** and **declare**: `declare` is an `iam:` write that can target *any* role in the demo account, not only the grove target role (the create sense of `rogue-process × declare` mints a new role entirely). The actual reason `act`/`declare` are impossible in `neither` is that no demo **credential can be obtained** in the first place — obtain itself is denied, so zero acts and zero declares are reachable. The four cells share one justification in the census even though only two of them are barred by it; the `act`/`declare` cells need the dependency reason (no session ⇒ no stage), not the arn reason. State the two bars separately so the barred-with-reason grade is accurate for every barred cell.

**snippet**:
```markdown
| **impossible** — barred by **nature** | no attempt is even possible | `{grove-clone, rogue-process} × {act, declare} × neither` — **4** | our target role is absent, so no token can name an arn. there is no api call to make |
```

---

# nitpick.2: Vault-reachability is barred by a fleet fact (nurture) but is folded out instead of recorded as a checkable invariant

**rule**: .agent/repo=bhuild/role=behaver/briefs/practices/behavior.vision/rule.require.dimensional-decomposition.md

**locations**:
- .behavior/v2026_09_06.feat-demo-trusts-ahbode-grove/1.vision.experience.dimensions.md

The rule names resource-absent states among the usual omissions and requires nurture-barred paths to be recorded as *checkable invariants*: "a nurture-barred path with its why is a checkable rule the execution must hold." The vault-reachability latent axis is barred today by a fleet config fact — "no camp grove holds an ehmpathy vault" — which is a nurture bar (a choice/fleet state, not a law of nature). The artifact handles this by folding the axis out entirely with a re-walk trigger, rather than by recording the fleet fact as an explicit, violable invariant the way the cicd forbidden cells get one. That is a weaker enforcement surface: a reviewer must hunt through prose to confirm the fleet premise, and there is no one-line "no camp grove may hold an ehmpathy vault" rule a future fleet change would visibly violate (the way a future github workflow applying `aws.auth` would visibly violate the cicd invariant). The path is walked in `case=1` `[t4]` — good — but the bar itself owes the same checkable-invariant treatment the cicd forbidden cells received.

**snippet**:
```markdown
**the fold, and its reason:** the second row is a **conditional** state, never a second experience. it is barred today by a fact about the grove fleet — no camp grove holds an ehmpathy vault — so a cross would generate a column that is `impossible` in every cell **under the state we assume**, and would flip wholesale the day that fact changes.
```
