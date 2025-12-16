import { type DomainEntity, RefByPrimary, RefByUnique } from 'domain-objects';
import type { LogMethods } from 'simple-log-methods';

import {
  DeclaredAwsOrganization,
  DeclaredAwsOrganizationAccount,
  getDeclastructAwsProvider,
} from '../../../src/contract/sdks';
import { SSO_DEMO_EMAIL } from '../resources.common';

const log: LogMethods = {
  info: console.info,
  debug: (): void => {},
  warn: console.warn,
  error: console.error,
};

// demo account reference
export const demoAccountRef: RefByUnique<
  typeof DeclaredAwsOrganizationAccount
> = RefByUnique.as<typeof DeclaredAwsOrganizationAccount>({
  email: SSO_DEMO_EMAIL,
});

/**
 * .what = demo account in the organization
 * .why = creates a separate account for demo/testing purposes
 */
export const getResourcesOfDemoAccount = async (): Promise<
  DomainEntity<any>[]
> => {
  const provider = await getDeclastructAwsProvider({}, { log });
  const managementAccountId = provider.context.aws.credentials.account;

  // organization
  const organization = DeclaredAwsOrganization.as({
    managementAccount: RefByPrimary.as<typeof DeclaredAwsOrganizationAccount>({
      id: managementAccountId,
    }),
    featureSet: 'ALL',
  });

  // demo account
  const demoAccount = new DeclaredAwsOrganizationAccount({
    organization,
    name: 'ehmpathy-demo',
    email: demoAccountRef.email,
    iamUserAccessToBilling: 'ALLOW',
    roleName: 'OrganizationAccountAccessRole',
    tags: {
      managedBy: 'declastruct',
      purpose: 'demo',
    },
  });

  return [organization, demoAccount];
};
