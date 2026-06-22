import type { DeclastructProvider } from 'declastruct';
import type { DomainEntity } from 'domain-objects';

import { getDeclastructAwsProvider } from '../../../src/contract/sdks';
import { getResourcesOfEc2 } from './resources.ec2';
import { getResourcesOfVpc } from './resources.vpc';

const log = {
  info: console.info,
  debug: (): void => {},
  warn: console.warn,
  error: console.error,
};

/**
 * .what = demo account infrastructure resources (VPC, EC2, etc)
 * .why = dogfood VPC + EC2 resources to verify OIDC role has correct permissions
 *
 * @see readme.md for prereqs and apply instructions
 */
export const getProviders = async (): Promise<DeclastructProvider[]> => [
  await getDeclastructAwsProvider({}, { log }),
];

export const getResources = async (): Promise<DomainEntity<any>[]> => {
  return [...getResourcesOfVpc(), ...getResourcesOfEc2()];
};
