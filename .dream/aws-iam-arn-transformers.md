# dream: aws-iam-arn-transformers

## .what

add `asIamRoleArn` (and its peers `asIamPolicyArn`, `asIamOidcProviderArn`) to
`src/domain.operations/iamRole/` and siblings, so an iam arn is composed by a named
transformer rather than hand-built at each call site.

## .why

this repo already has a settled mechanism for arn composition — an `as$NounArn` transformer,
one per resource family, each a pure two-line function:

| extant | at |
|---|---|
| `asBudgetArn` | `src/domain.operations/budget/` |
| `asSnsTopicArn` | `src/domain.operations/snsTopic/` |
| `asSesEmailIdentityArn` | `src/domain.operations/sesEmailIdentity/` |
| `asSesConfigurationSetArn` | `src/domain.operations/sesConfigurationSet/` |
| `asSesReceiptRuleArn` | `src/domain.operations/sesReceiptRule/` |

**iam is the one family with no member**, and it is the family with the most hand-built arns:

| hand-composed at | composes |
|---|---|
| `src/domain.operations/lambda/setLambda.ts:66` | a role arn |
| `src/domain.operations/iamPolicy/getOneIamPolicy.ts:76` | a policy arn |
| `provision/aws.auth/account=demo/resources.oidc.ts:40` | an oidc-provider arn — 🟡 carries a `todo:` from a prior author flagging this exact gap |
| `provision/aws.auth/account=demo/resources.reach.ts:33` | a foreign role arn (the grove reach's caller principal) |

⇒ four sites, one absent transformer. `rule.require.named-transformers` calls the inline form
decode-friction; the mechanism simply has a hole in one family.

## .the ask

- **`asIamRoleArn({ account, name, path? })`** → `arn:aws:iam::<account>:role<path><name>`
  ⚠️ note the `path` segment — `DeclaredAwsIamRole` carries a `path` field (default `'/'`), and
  every hand-built site above assumes `/`. the transformer is where that assumption gets stated
  once instead of four times
- `asIamPolicyArn`, `asIamOidcProviderArn` as the same shape
- a unit test each (`rule.require.test-coverage-by-grain`: transformer → unit test)
- update the four call sites above; drop the `todo:` at `resources.oidc.ts:40`

## .until then

each site hand-composes. 🟡 `provision/` **can** reach these directly once they exist —
`provision/cloudflare/resources.mail.dns.ts:13` already imports
`src/domain.operations/sesEmailIdentity/asSesEmailIdentityDnsRecords` — so no
`src/contract/sdks` export is owed for the provision half.

## .why it is not done in this round

`0.wish.md` bars `src/` changes outright: *"any `declastruct-aws` **library** change (`src/`).
this is provision work … if you find you need a new resource type, that is a real find — raise
it rather than absorb it."*

⇒ the SAFE/CLEAN test lands **safe, not clean**: a pure transformer carries no behavior risk,
and it lands in a tree this wish declared out of bounds plus four call-site edits and three unit
tests. so it is raised, per the wish's own instruction.

## .see also

- `rule.require.named-transformers`, `rule.require.get-set-gen-verbs` (the `as*` prefix)
- `rule.prefer.most-common-denominator` — the transformers already sit at their leaf
- `.behavior/v2026_09_06.feat-demo-trusts-ahbode-grove/` — the route that found it
