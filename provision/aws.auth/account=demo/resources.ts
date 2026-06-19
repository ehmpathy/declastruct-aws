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
 * .what = demo account resources (OIDC for GitHub Actions)
 * .why = enables GitHub Actions CI/CD access to demo account
 *
 * @see readme.md for prereqs and apply instructions
 */
export const getProviders = async (): Promise<DeclastructProvider[]> => [
  await getDeclastructAwsProvider({}, { log }),
];

export const getResources = async (): Promise<DomainEntity<any>[]> => {
  return getResourcesOfOidc();
};
