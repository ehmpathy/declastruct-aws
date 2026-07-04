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
- OIDC role permissions in `provision/aws.auth/account=demo/resources.oidc.ts` use the same `demoPermissionsPolicy`
- changes propagate to both SSO and OIDC auth methods

## .see also

- `provision/aws.auth/readme.md` — full auth setup documentation
- `howto.dogfood-aws-resources.md` — dogfood pattern
