import type { DeclastructProvider } from 'declastruct';
import type { DomainEntity } from 'domain-objects';

import { getDeclastructAwsProvider } from '../../../src/contract/sdks';
import { getResourcesOfAdminSso } from './resources.admin.sso';
import { getResourcesOfDemoAccount } from './resources.demo.account';
import { getResourcesOfDemoSso } from './resources.demo.sso';
import { getResourcesOfRootAccount } from './resources.root.account';

const log = {
  info: console.info,
  debug: (): void => {},
  warn: console.warn,
  error: console.error,
};

/**
 * .what = all root account resources
 * .why = aggregates admin sso, demo account, and demo sso resources
 *
 * .auth = AWS_PROFILE=use.ehmpathy.root.admin
 *
 * .usage
 *   use.ehmpathy.root.admin
 *   npx declastruct plan provision/aws.auth/account=.root/resources.ts
 *   npx declastruct apply provision/aws.auth/account=.root/resources.ts
 *
 * .prereq
 *   - identity center must be enabled manually in console (one-time)
 *   - see bootstrap.md for first-time setup
 */
export const getProviders = async (): Promise<DeclastructProvider[]> => [
  await getDeclastructAwsProvider({}, { log }),
];

export const getResources = async (): Promise<DomainEntity<any>[]> => {
  const [adminSso, demoAccount, demoSso, rootAccount] = await Promise.all([
    getResourcesOfAdminSso(),
    getResourcesOfDemoAccount(),
    getResourcesOfDemoSso(),
    getResourcesOfRootAccount(),
  ]);

  return [
    // provision the accounts
    ...demoAccount,

    // then provision the agent ssos
    ...adminSso,
    ...demoSso,

    // then provision the root account resources (scps)
    ...rootAccount,
  ];
};
