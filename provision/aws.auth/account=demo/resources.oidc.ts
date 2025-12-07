import { type DomainEntity, RefByPrimary, refByUnique } from 'domain-objects';

import {
  DeclaredAwsIamOidcProvider,
  type DeclaredAwsIamPolicy,
  DeclaredAwsIamPolicyStatement,
  DeclaredAwsIamRole,
  DeclaredAwsIamRolePolicyAttachedInline,
  DeclaredAwsIamRolePolicyAttachedManaged,
  getDeclastructAwsProvider,
} from '../../../src/contract/sdks';
import { demoPermissionsPolicy, log } from '../resources.common';

/**
 * .what = github oidc resources for ci/cd access
 * .why = enables github actions to access demo account via oidc
 *
 * .note
 *   - must be provisioned with demo account credentials
 *   - the oidc provider and role must be in the same account as the resources they access
 */
export const getResourcesOfOidc = async (): Promise<DomainEntity<any>[]> => {
  const provider = await getDeclastructAwsProvider({}, { log });
  const accountId = provider.context.aws.credentials.account;

  // github oidc provider
  // note: as of 2025, AWS trusts GitHub's root CA — thumbprints are ignored
  // ref: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html
  const githubOidcProvider = new DeclaredAwsIamOidcProvider({
    url: 'https://token.actions.githubusercontent.com',
    clientIds: ['sts.amazonaws.com'],
    thumbprints: [], // empty — AWS uses trusted root CA for GitHub
    tags: {
      managedBy: 'declastruct',
      purpose: 'github-actions-oidc',
    },
  });

  // construct the oidc provider arn (predictable from url + account)
  const oidcProviderArn = `arn:aws:iam::${accountId}:oidc-provider/token.actions.githubusercontent.com`; // todo: generalize this into the .get.ref.ByPrimary given unique + context for this dobj

  // demo oidc role for github actions
  const demoOidcRole = new DeclaredAwsIamRole({
    name: 'ehmpathy-demo-oidc',
    path: '/',
    description: 'Demo role for github actions (OIDC)',
    policies: [
      new DeclaredAwsIamPolicyStatement({
        effect: 'Allow',
        principal: {
          federated: oidcProviderArn,
        },
        action: 'sts:AssumeRoleWithWebIdentity',
        condition: {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          StringLike: {
            'token.actions.githubusercontent.com:sub': 'repo:ehmpathy/*:*',
          },
        },
      }),
    ],
    tags: {
      managedBy: 'declastruct',
      purpose: 'demo',
    },
  });

  // attach managed policies to the oidc role
  const demoOidcRoleManagedPolicies = demoPermissionsPolicy.managed.map(
    (policyArn) =>
      new DeclaredAwsIamRolePolicyAttachedManaged({
        role: refByUnique<typeof DeclaredAwsIamRole>(demoOidcRole),
        policy: RefByPrimary.as<typeof DeclaredAwsIamPolicy>({
          arn: policyArn,
        }),
      }),
  );

  // attach inline permissions to the oidc role
  const demoOidcRoleInlinePolicy = new DeclaredAwsIamRolePolicyAttachedInline({
    name: 'ehmpathy-demo-permissions',
    role: refByUnique<typeof DeclaredAwsIamRole>(demoOidcRole),
    document: demoPermissionsPolicy.inline,
  });

  return [
    githubOidcProvider,
    demoOidcRole,
    demoOidcRoleInlinePolicy,
    ...demoOidcRoleManagedPolicies,
  ];
};
