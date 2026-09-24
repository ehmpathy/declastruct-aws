✨ all clear
   ├─ logs: .log/bhrain/review/2026-09-08T07-51-56-184Z
   ├─ review: .behavior/v2026_09_06.feat-demo-trusts-ahbode-grove/.reviews/self/verify.r024.experience-coverage.md
   └─ summary
      ├─ 0 blockers
      └─ 1 nitpicks 🟠

---
# nitpick.1: case=4 is told from the system's point of view rather than an actor's lived experience

**rule**: .agent/repo=bhuild/role=behaver/briefs/practices/behavior.vision/rule.require.experience-coverage.md

**locations**:
- .behavior/v2026_09_06.feat-demo-trusts-ahbode-grove/1.vision.experience.case=4.cicd-stays-unchanged.md:12

The rule grades *"a case written from the system's point of view instead of an actor's"* as a nitpick — it restates a behavior, not an experience. case=4 ("cicd never notices") is the one demo in this corpus written from the system's vantage: the narrative's subject throughout is "github actions" / "the pipeline" ("federates onto ehmpathy-demo-oidc... runs test-integration... passes. the pipeline never learns... that is the correct outcome"), and every step of its `[tn]` is a system action ("the workflow runs the demo-account suites... both pass, with the same permissions they held before"). The case itself justifies this as "the **absence** of an experience, demonstrated... the pipeline's whole desired encounter is that it has no encounter at all" — but by the letter of the rule this remains a restatement of the reach-state invariance, not a lived encounter. It is worth flagging because the vision elsewhere (case=6, over the same class of "nothing happens" event) deliberately anchors the narrative to an actor's lived moment ("they scroll past it to the rows they came for") — the same fix is available here (e.g., a developer/reviewer reading the plan diff and confirming cicd rows read KEEP).

**snippet**:
```markdown
a pull request opens. github actions federates onto `ehmpathy-demo-oidc` exactly as it did
the day before, runs `test-integration` against the demo account, and passes. the pipeline
never learns that a grove can now reach demo, and that is the correct outcome.
```
