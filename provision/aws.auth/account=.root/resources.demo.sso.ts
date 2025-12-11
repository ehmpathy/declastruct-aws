import { type DomainEntity, refByUnique } from 'domain-objects';

import {
  DeclaredAwsSsoAccountAssignment,
  type DeclaredAwsSsoInstance,
  DeclaredAwsSsoPermissionSet,
  DeclaredAwsSsoUser,
  getDeclastructAwsProvider,
  getOneSsoInstance,
} from '../../../src/contract/sdks';
import {
  demoPermissionsPolicy,
  log,
  SSO_DEMO_EMAIL,
} from '../resources.common';
import { demoAccountRef } from './resources.demo.account';

/**
 * .what = demo sso resources for agent access
 * .why = enables demo agents to access demo account via sso
 */
export const getResourcesOfDemoSso = async (): Promise<DomainEntity<any>[]> => {
  const provider = await getDeclastructAwsProvider({}, { log });

  const ssoInstance = await getOneSsoInstance(
    { by: { auth: true } },
    provider.context,
  );
  if (!ssoInstance) throw new Error('identity center not enabled');

  // demo permission set
  const demoPermissionSet = new DeclaredAwsSsoPermissionSet({
    instance: refByUnique<typeof DeclaredAwsSsoInstance>(ssoInstance),
    name: 'ehmpathy-demo-sso',
    description: 'Demo access for ehmpathy agents (SSO)',
    sessionDuration: 'PT4H',
    policy: demoPermissionsPolicy,
    tags: null,
  });

  // demo user
  const demoUser = new DeclaredAwsSsoUser({
    instance: refByUnique<typeof DeclaredAwsSsoInstance>(ssoInstance),
    userName: 'demo-agent',
    displayName: 'Demo Agent',
    givenName: 'Demo',
    familyName: 'Agent',
    email: SSO_DEMO_EMAIL,
  });

  // demo assignment
  const demoAssignment = new DeclaredAwsSsoAccountAssignment({
    instance: refByUnique<typeof DeclaredAwsSsoInstance>(ssoInstance),
    permissionSet:
      refByUnique<typeof DeclaredAwsSsoPermissionSet>(demoPermissionSet),
    principalType: 'USER',
    principal: refByUnique<typeof DeclaredAwsSsoUser>(demoUser),
    targetType: 'AWS_ACCOUNT',
    target: demoAccountRef,
  });

  return [demoPermissionSet, demoUser, demoAssignment];
};
