import { DeclastructProvider } from 'declastruct';
import { DomainEntity } from 'domain-objects';

import {
  DeclaredAwsOrganization,
  DeclaredAwsOrganizationAccount,
  getDeclastructAwsProvider,
  setOrganization,
} from '../../src/contract/sdks';

/**
 * .what = provider configuration for AWS organization provisioning
 * .why = enables declastruct CLI to interact with AWS Organizations API
 * .note = requires AWS_PROFILE to be set to an account that can manage organizations
 */
export const getProviders = async (): Promise<DeclastructProvider[]> => [
  await getDeclastructAwsProvider(
    {},
    {
      log: {
        info: console.info,
        debug: () => {},
        warn: console.warn,
        error: console.error,
      },
    },
  ),
];

/**
 * .what = resource declarations for AWS organization provisioning
 * .why = defines desired state of organization and member accounts
 *
 * .steps
 *   1. ensure organization exists for the authenticated account (finsert)
 *   2. declare demo account within the organization
 *
 * .usage
 *   AWS_PROFILE=<admin-profile> npx declastruct apply provision/aws/declastruct.resources.ts
 *
 * .note
 *   - organization must be finserted first to obtain its id
 *   - the account then references the org by primary key (id)
 */
export const getResources = async (): Promise<DomainEntity<any>[]> => {
  // get the provider to access context
  const [provider] = await getProviders();
  const providerContext = (provider as any).context;
  const accountId = providerContext.aws.credentials.account;

  // finsert the organization first to ensure it exists and get its id
  const organization = await setOrganization(
    {
      finsert: DeclaredAwsOrganization.as({
        managementAccount: { id: accountId },
        featureSet: 'ALL',
      }),
    },
    providerContext,
  );

  // declare a demo account within the organization
  const demoAccount = DeclaredAwsOrganizationAccount.as({
    organization: { id: organization.id! },
    name: 'declastruct-demo',
    email: 'declastruct-demo@ahbode.dev',
    iamUserAccessToBilling: 'ALLOW',
    tags: { managedBy: 'declastruct', purpose: 'demo' },
  });

  // return resources for declastruct to apply
  // note: organization is finserted above, so only demo account needs apply
  return [organization, demoAccount];
};
