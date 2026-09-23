# howto.add-test-permissions

## .what

when integration or acceptance tests fail due to absent AWS permissions, add them via `provision/aws.auth/resources.common.ts`.

## .why

- demo-agent permissions are declaratively managed
- single source of truth for all test environment access
- changes are versioned and reviewable
- declastruct applies them idempotently

## .where

```
provision/aws.auth/resources.common.ts
  └─ demoPermissionsPolicy: DeclaredAwsIamPolicyBundle
       └─ inline: DeclaredAwsIamPolicyDocument
            └─ statements: DeclaredAwsIamPolicyStatement[]
```

## .how

1. identify the absent permission from the error:
   ```
   AccessDenied: User: arn:aws:sts::...assumed-role/...demo-agent
   is not authorized to perform: iam:CreateInstanceProfile
   ```

2. add a new policy statement to `demoPermissionsPolicy.inline.statements`:
   ```typescript
   // IAM Instance Profiles: full access (required for EC2 IAM role assignment)
   new DeclaredAwsIamPolicyStatement({
     effect: 'Allow',
     action: [
       'iam:CreateInstanceProfile',
       'iam:DeleteInstanceProfile',
       // ... other actions
     ],
     resource: '*',
   }),
   ```

3. apply via declastruct from root account:
   ```sh
   # authenticate as root admin
   use.ehmpathy.root --owner admin

   # source env vars
   source provision/aws.auth/account=.root/.env

   # plan
   npx declastruct plan \
     --wish provision/aws.auth/account=.root/resources.ts \
     --into provision/aws.auth/account=.root/.temp/plan.json

   # apply
   npx declastruct apply \
     --plan provision/aws.auth/account=.root/.temp/plan.json
   ```

4. re-run the failed tests

## .note

- root account access required to apply SSO permission changes
- 🔴 **a change to `demoPermissionsPolicy` reaches EVERY consumer of that bundle, and each must be
  re-applied before its grant is live.** ⚠️ the consumer roster lives in exactly ONE place — the
  `.note` on `demoPermissionsPolicy` in `provision/aws.auth/resources.common.ts`. read it there;
  a count restated here would drift the day a consumer is added, which is precisely how this line
  came to name two when there were three
- the re-apply commands, per target, are in `hazard.local-green-cicd-red.oidc-role-not-reapplied`

## .see also

- `hazard.local-green-cicd-red.oidc-role-not-reapplied` — the roster's targets, and the plan-read
  each one owes
- `provision/aws.auth/readme.md` — full auth setup documentation
- `howto.dogfood-aws-resources.md` — dogfood pattern
