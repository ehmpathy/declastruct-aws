import { type DomainEntity, RefByPrimary, RefByUnique } from 'domain-objects';
import { genLogMethods } from 'sdk-logs';

import {
  DeclaredAwsOrganization,
  DeclaredAwsOrganizationAccount,
  getDeclastructAwsProvider,
} from '../../../src/contract/sdks';
import { getOneSsoDemoEmail } from '../resources.common';

const log = genLogMethods();

/**
 * .what = lazy getter for demo account reference
 * .why = defer env var access until actually needed
 */
export const getOneDemoAccountRef = (): RefByUnique<
  typeof DeclaredAwsOrganizationAccount
> =>
  RefByUnique.as<typeof DeclaredAwsOrganizationAccount>({
    email: getOneSsoDemoEmail(),
  });

/**
 * .what = demo account in the organization
 * .why = creates a separate account for demo/test purposes
 */
export const getResourcesOfDemoAccount = async (): Promise<
  DomainEntity<any>[]
> => {
  const provider = await getDeclastructAwsProvider({}, { log });
  const managementAccountId = provider.context.aws.credentials.account;

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
    email: getOneDemoAccountRef().email,
    iamUserAccessToBilling: 'ALLOW',
    roleName: 'OrganizationAccountAccessRole',
    tags: {
      managedBy: 'declastruct',
      purpose: 'demo',
    },
  });

  return [organization, demoAccount];
};
