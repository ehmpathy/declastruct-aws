# F8 — out-of-pr local integration failures do not block this route

## .the fork
- A: block verification until the full local integration suite is green: apply `account=.root` (refresh the sso permission set) and deflake two journey suites first
- B: verify on this branch's own integration set (3 files, green), record each out-of-pr failure with its diagnosis, hand the foreman the one command that clears the iam class, and catch the flake as a dream

## .taken
B. the full local run read `262 passed, 7 failed, 20 skipped` (48 suites, 865s). none of the 7 touches a file this pr changes:
- 6 are `AccessDenied` on `iam:CreateUser` for the local sso session. source grants it (`provision/aws.auth/resources.common.ts:123`) and the ci (oidc) role holds it live (the demo plan reads it KEEP). the stale consumer is the sso permission set, which only an `account=.root` apply refreshes: the repo's own `hazard.local-green-cicd-red`, inverted. that apply is a privileged act on the org root, never a driver's
- 1 is a 600s hang in `ssmParameterSecure.journey` under full parallel load; alone it passes 13/13 in 42s. an ec2 journey hung the same way and passed on retry. a live flake class, caught as `dreams/v2026_11_16.fix.integration-aws-calls-hang-under-parallel-load.md`

## .rework
clean: a later route can run the deflake and the root apply; neither changes this pr.

## .confidence — 75%
why not higher: the verification stone reads every failure as this pr's to fix; the director may want the root apply and the deflake done before the pr ships.

## .the foreman's command
apply `account=.root` per its readme (it updates the sso permission set from `demoPermissionsPolicy`), then rerun `rhx git.repo.test --what integration --scope 'path://iamUser' --mode apply`.

## .verdict
open — for the director at the done gate.
