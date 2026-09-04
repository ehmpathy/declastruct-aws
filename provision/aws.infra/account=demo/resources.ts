import type { DeclastructProvider } from 'declastruct';
import type { DomainEntity } from 'domain-objects';
import { keyrack } from 'rhachet/keyrack';
import { genLogMethods } from 'sdk-logs';

import {
  getCredentials,
  getDeclastructAwsProvider,
} from '../../../src/contract/sdks';
import { getResourcesOfBudget } from './resources.budget';
import { getResourcesOfEc2Hibernator } from './resources.ec2.hibernator';
import { getResourcesOfEc2Nat } from './resources.ec2.nat';
import { getResourcesOfIam } from './resources.iam';
import { getResourcesOfMail } from './resources.mail';
import { getResourcesOfSsm } from './resources.ssm';
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
  // the mail stack hand-builds a receipt-rule arn, so it needs the account + region. read them
  // via the CHEAP credential lookup (region from env/config + account from STS), NOT a second
  // full provider build (which would re-construct the whole ~60-entry DAO map just for 2 strings)
  const { account, region } = await getCredentials();

  // order matters:
  //   - vpc + iam first (the ec2 templates reference the instance profile)
  //   - then the nat (the private route table references it by exid)
  //   - then the hibernator box (its egress routes through the nat)
  return [
    ...getResourcesOfVpc(),
    ...getResourcesOfIam(),
    ...getResourcesOfEc2Nat(),
    ...getResourcesOfEc2Hibernator(),
    // budget posture: the $21/mo cap + tiered alerts + anomaly + estimated-charges
    // alarm (member-account-safe; the guards in resources.budget.ts are wisher-gated)
    ...getResourcesOfBudget(),
    // ssm params: dogfood the plain + secure DeclaredAwsSsmParameter resources
    ...getResourcesOfSsm(),
    // the mail stack — dogfood the SES/S3/SNS mail primitives (last, so core infra applies
    // first; a non-SES-inbound region fails loud here, which is the intended guard)
    ...getResourcesOfMail({ account, region }),
  ];
};
