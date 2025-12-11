import type { DeclastructProvider } from 'declastruct';
import type { DomainEntity } from 'domain-objects';

import { getDeclastructAwsProvider } from '../../../src/contract/sdks';
import { getResourcesOfOidc } from './resources.oidc';

const log = {
  info: console.info,
  debug: (): void => {},
  warn: console.warn,
  error: console.error,
};

/**
 * .what = demo account resources (oidc for github actions)
 * .why = enables github actions ci/cd access to demo account
 *
 * .auth = demo account credentials (via sso or assume role)
 *
 * .usage
 *   use.declastruct.demo.admin
 *   npx declastruct plan provision/aws.auth/account=demo/resources.ts
 *   npx declastruct apply provision/aws.auth/account=demo/resources.ts
 *
 * .prereq
 *   - demo account must exist (provisioned via account=.root/resources.ts)
 *   - must be authenticated to demo account, not management account
 */
export const getProviders = async (): Promise<DeclastructProvider[]> => [
  await getDeclastructAwsProvider({}, { log }),
];

export const getResources = async (): Promise<DomainEntity<any>[]> => {
  return getResourcesOfOidc();
};
