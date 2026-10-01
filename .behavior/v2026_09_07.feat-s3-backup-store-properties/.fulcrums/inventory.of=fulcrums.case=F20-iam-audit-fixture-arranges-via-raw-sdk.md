# F20 — the iam audit fixture arranges its user + key via raw sdk, never a declared resource

**raised** 5.3.verification, peer lane `repo-rules` blocker.1 · **rework** clean · **status** 🔴 OPEN — the drive's call; no council has ruled it · **confidence** 85%

## .the fork, stated fairly

`src/.test/setTestIamUserThrowaway.ts` creates a throwaway iam user and one access key with raw
`@aws-sdk/client-iam` calls, so three read-only audit tests have a real key to read:
`getOneIamUser`, `getAllIamUserAccessKeys`, `getOneIamUserAccessKey`.

| option | what it takes |
|---|---|
| **(a) raw-sdk arrange** — taken | a `.test/` helper, name-prefix scoped to `declastruct-test-*`, both-ends cleanup |
| (b) extend the model | give `DeclaredAwsIamUserDao` a `findsert`, and `setIamUserAccessKey` a create path, then declare the fixture |

`rule.require.declarative-test-infra` names (b) as the default: *"the imperative workaround is the
bug report; closure of the model gap is the fix."*

## .taken, and why — at the time

**(a)**, because (b) is not a model gap. it is a product decision the model states outright:

- `DeclaredAwsIamUserDao.ts:32-34` — *"IAM users are managed externally; set operations not supported"*
- `setIamUserAccessKey.ts:24` — *"not supported. IAM user access keys have been superseded by SSO and
  OIDC federation … use getAllIamUserAccessKeys + delIamUserAccessKey to audit and purge"*

⇒ the library declares users and keys as **audit-only** resources. to add a declared create path
would ship a public contract that mints long-lived credentials, which the library deliberately
refuses, to serve a test fixture. that reverses a security stance, and wish #99 does not ask for it.

the fixture ARRANGES a precondition for tests of read-only resources. no declared action is
bypassed, because no declared create exists.

## .rework — clean

one helper file and three `useBeforeAll` call sites. if a council rules (b), the helper is replaced by
a declared fixture and the three tests do not change their assertions.

## .confidence — 85%, and why it is not higher

the refusal is written in the model, so the product half is settled. the open half is the RULE: it
has no named exemption for "arrange a precondition the model deliberately cannot create". the
acceptance-test peer rule (`rule.forbid.imperative-drive-in-acceptance-tests`) permits exactly that
arrange, and this rule is silent. whether the silence means "forbidden" or "not considered" is a
council's read.

## .where

- `src/.test/setTestIamUserThrowaway.ts`
- the grant it needs: `provision/aws.auth/resources.common.ts:123-124` (`iam:CreateUser`,
  `DeleteUser`, `TagUser` on `arn:aws:iam::*:user/declastruct-test-*`), applied by the wisher

## .the verdict

— unruled
