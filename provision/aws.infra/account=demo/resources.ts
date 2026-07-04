import type { DeclastructProvider } from 'declastruct';
import type { DomainEntity } from 'domain-objects';
import { keyrack } from 'rhachet/keyrack';
import { genLogMethods } from 'sdk-logs';

import { getDeclastructAwsProvider } from '../../../src/contract/sdks';
import { getResourcesOfEc2Hibernator } from './resources.ec2.hibernator';
import { getResourcesOfEc2Nat } from './resources.ec2.nat';
import { getResourcesOfIam } from './resources.iam';
import { getResourcesOfVpc } from './resources.vpc';

// source aws credentials from keyrack
keyrack.source({ env: 'prep', owner: 'ehmpath', mode: 'lenient' });

const log = genLogMethods();

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
  // order matters:
  //   - vpc + iam first (the ec2 templates reference the instance profile)
  //   - then the nat (the private route table references it by exid)
  //   - then the hibernator box (its egress routes through the nat)
  return [
    ...getResourcesOfVpc(),
    ...getResourcesOfIam(),
    ...getResourcesOfEc2Nat(),
    ...getResourcesOfEc2Hibernator(),
  ];
};
