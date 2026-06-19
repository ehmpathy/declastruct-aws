import type { DeclastructProvider } from 'declastruct';
import type { DomainEntity } from 'domain-objects';

import { getDeclastructAwsProvider } from '../../../src/contract/sdks';
import { getResourcesOfVpc } from './resources.vpc';

const log = {
  info: console.info,
  debug: (): void => {},
  warn: console.warn,
  error: console.error,
};

/**
 * .what = demo account infrastructure resources (VPC, etc)
 * .why = dogfood VPC resources to verify OIDC role has correct permissions
 *
 * @see readme.md for prereqs and apply instructions
 */
export const getProviders = async (): Promise<DeclastructProvider[]> => [
  await getDeclastructAwsProvider({}, { log }),
];

export const getResources = async (): Promise<DomainEntity<any>[]> => {
  return getResourcesOfVpc();
};
