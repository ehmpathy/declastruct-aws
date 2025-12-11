import { type DomainEntity, RefByPrimary, refByUnique } from 'domain-objects';

import {
  DeclaredAwsIamPolicyBundle,
  DeclaredAwsIamPolicyDocument,
  type DeclaredAwsOrganizationAccount,
  DeclaredAwsSsoAccountAssignment,
  type DeclaredAwsSsoInstance,
  DeclaredAwsSsoPermissionSet,
  DeclaredAwsSsoUser,
  getDeclastructAwsProvider,
  getOneSsoInstance,
} from '../../../src/contract/sdks';
import { log, SSO_ADMIN_EMAIL, SSO_ADMIN_USERNAME } from '../resources.common';
import { demoAccountRef } from './resources.demo.account';

/**
 * .what = admin sso resources for human administrators
 * .why = enables admins to signin via `aws sso login` instead of root credentials
 */
export const getResourcesOfAdminSso = async (): Promise<
  DomainEntity<any>[]
> => {
  const provider = await getDeclastructAwsProvider({}, { log });

  const ssoInstance = await getOneSsoInstance(
    { by: { auth: true } },
    provider.context,
  );
  if (!ssoInstance)
    throw new Error(
      'identity center not enabled. enable it in aws console first.',
    );

  // admin permission set
  const adminPermissionSet = new DeclaredAwsSsoPermissionSet({
    instance: refByUnique<typeof DeclaredAwsSsoInstance>(ssoInstance),
    name: 'AdministratorAccess',
    description: null,
    sessionDuration: 'PT1H',
    policy: new DeclaredAwsIamPolicyBundle({
      managed: ['arn:aws:iam::aws:policy/AdministratorAccess'],
      inline: new DeclaredAwsIamPolicyDocument({ statements: [] }),
    }),
    tags: null,
  });

  // admin user
  const adminUser = new DeclaredAwsSsoUser({
    instance: refByUnique<typeof DeclaredAwsSsoInstance>(ssoInstance),
    userName: SSO_ADMIN_USERNAME,
    displayName: SSO_ADMIN_USERNAME,
    givenName: SSO_ADMIN_USERNAME,
    familyName: SSO_ADMIN_USERNAME,
    email: SSO_ADMIN_EMAIL,
  });

  // admin assignment to root account
  const adminAssignmentToRoot = new DeclaredAwsSsoAccountAssignment({
    instance: refByUnique<typeof DeclaredAwsSsoInstance>(ssoInstance),
    permissionSet:
      refByUnique<typeof DeclaredAwsSsoPermissionSet>(adminPermissionSet),
    principalType: 'USER',
    principal: refByUnique<typeof DeclaredAwsSsoUser>(adminUser),
    targetType: 'AWS_ACCOUNT',
    target: RefByPrimary.as<typeof DeclaredAwsOrganizationAccount>({
      id: provider.context.aws.credentials.account,
    }),
  });

  //  admin assignment to root account
  const adminAssignmentToDemo = new DeclaredAwsSsoAccountAssignment({
    instance: refByUnique<typeof DeclaredAwsSsoInstance>(ssoInstance),
    permissionSet:
      refByUnique<typeof DeclaredAwsSsoPermissionSet>(adminPermissionSet),
    principalType: 'USER',
    principal: refByUnique<typeof DeclaredAwsSsoUser>(adminUser),
    targetType: 'AWS_ACCOUNT',
    target: demoAccountRef,
  });

  return [
    adminPermissionSet,
    adminUser,
    adminAssignmentToRoot,
    adminAssignmentToDemo,
  ];
};
