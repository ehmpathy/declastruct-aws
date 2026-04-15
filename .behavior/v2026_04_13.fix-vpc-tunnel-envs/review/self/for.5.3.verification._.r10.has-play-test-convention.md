# self-review: has-play-test-convention (round 10)

## the question

are journey test files named correctly?

## step 1: search for journey tests

```bash
Glob: **/*.play.test.ts
# result: No files found
```

**no `.play.test.ts` files exist in this repo.**

## step 2: examine repo test conventions

```bash
Glob: src/**/*.test.ts
# result: 97 test files
```

test file categories in this repo:
- `*.test.ts` — unit tests (e.g., `getTunnelHash.test.ts`)
- `*.integration.test.ts` — integration tests (e.g., `getIamRole.integration.test.ts`)
- `*.acceptance.test.ts` — acceptance tests (e.g., `declastruct.acceptance.test.ts`)

**the repo does NOT use `.play.test.ts` convention anywhere.**

this is not a convention violation — the repo predates the `.play.test.ts` convention. the fallback is:
- unit tests: `*.test.ts`
- integration tests: `*.integration.test.ts`
- acceptance tests: `*.acceptance.test.ts`

## step 2: should this behavior have journey tests?

the vision describes a journey:
> a developer:
> 1. runs `STAGE=dev ./.agent/repo=.this/skills/use.vpc.tunnel.ts`
> 2. tunnel opens to dev
> 3. runs `STAGE=prod ...` in another terminal
> 4. tunnel opens to prod
> 5. both coexist

this is a journey. but it requires:
- real aws credentials
- real bastion instances (dev + prod)
- real rds clusters (dev + prod)
- real ssm connections

**this is integration scope, not unit scope.**

## step 3: what test coverage exists?

| test file | scope | what it verifies |
|-----------|-------|------------------|
| DeclaredAwsVpcTunnel.test.ts | unit | unique keys include account, region |
| getTunnelHash.test.ts | unit | different account → different hash |
| asSsmStartSessionArgs.test.ts | unit | ssm args include region |
| asTunnelLogEntry.test.ts | unit | log entry includes account, region |
| setVpcTunnel.test.ts | unit | CLOSED path mechanics |

the mechanics that enable the journey are unit tested. the journey itself requires integration infrastructure.

## step 4: is the absence of journey tests a gap?

**pause and think.**

the guide says journey tests should use `.play.test.ts` suffix. but it doesn't say every behavior must have journey tests.

for this behavior:
- unit tests verify the mechanics
- the journey requires external infrastructure
- a `.play.test.ts` would require real aws setup

**assessment:** the absence of journey tests is a scope boundary, not a gap.

## step 5: what would a journey test look like?

```ts
// hypothetical: setVpcTunnel.play.integration.test.ts
describe('setVpcTunnel journey', () => {
  given('dev and prod environments', () => {
    when('dev tunnel opens', () => {
      then('dev tunnel is active', async () => {
        // requires real aws credentials for dev account
      });
    });
    when('prod tunnel opens in parallel', () => {
      then('prod tunnel is active alongside dev', async () => {
        // requires real aws credentials for prod account
      });
    });
  });
});
```

this would require:
- two aws accounts
- ssm access in both
- bastion + rds in both
- port configuration

**this is CI/infrastructure setup, not a code gap.**

## step 6: verify no convention violation

| check | result |
|-------|--------|
| journey tests exist? | no |
| should they exist? | no — requires external infrastructure |
| name convention violated? | no — no files to name |

## conclusion

✓ no `.play.test.ts` files created — verified via glob
✓ no journey tests needed — requires external infrastructure
✓ name convention not violated — no files to misname
✓ unit tests verify mechanics that enable the journey

this behavior correctly scopes to unit tests. journey tests belong in the consumer repo with infrastructure access.
