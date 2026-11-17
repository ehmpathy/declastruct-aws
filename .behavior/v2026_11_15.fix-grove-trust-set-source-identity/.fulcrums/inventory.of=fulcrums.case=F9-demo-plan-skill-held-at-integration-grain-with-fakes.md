# F9 — the demo plan skill is held at integration grain, with fakes at its three boundaries

## .the fork
- A: add a committed real-call test of `rhx aws.auth.demo.plan` (real keyrack, sts, iam, declastruct plan), and an `.acceptance.test.ts` lane for it
- B: keep `aws.auth.demo.plan.integration.test.ts` as the skill's suite: real bash runs the real skill, fakes stand in for `rhx`, `aws`, `npx` on PATH; the real path is proven by the recorded live run and by each plan read before a go

## .taken
B.
- **a real-call test cannot run in ci.** ci gets aws creds from oidc (`.github/workflows/.test.yml`, `role-to-assume`). the skill unsets every `AWS_*` and binds keyrack `--env test`, which ci does not hold. a real test there goes red on every run; gated by env, it is the silent skip `rule.forbid.skipped-tests` forbids. the fix is the skill's creds source, caught as `dreams/v2026_11_15.fix.skills-share-one-keyrack-creds-operation.md`
- **the fakes carry the branches no live account gives on cue**: keyrack refused, sts refused, NoSuchEntity, AccessDenied, a list principal. each is a snapped exit with its fix named
- **the real boundaries are proven live elsewhere**: `setIamRole.integration.test.ts` (real iam, the three-action trust read back in order), the demo plan run through the skill (`KEEP: 6`, `UPDATE: 1`, recorded in `5.3.verification.yield.md`)
- **acceptance grain**: this repo's acceptance lane proves declared resources through the built package (`rule.require.acceptance-tests-for-resources`). the skill ships in no package; it is a repo-local tool for the applier. its test already drives it black-box: spawn the shipped file, read stdout, stderr, exit, snapshots

## .rework
clean: once the skill takes creds from the ambient profile when keyrack is absent (the dream), a ci-run real test is one file.

## .confidence — 78%
why not higher: the rule reads "at least one real integration test must exist" without a carve-out for repo-local skills; the director may want the creds rework before merge.

## .verdict
open — for the director at the done gate.
