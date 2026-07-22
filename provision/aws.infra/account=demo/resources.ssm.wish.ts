import type { DeclastructProvider } from 'declastruct';
import type { DomainEntity } from 'domain-objects';
import { keyrack } from 'rhachet/keyrack';
import { genLogMethods } from 'sdk-logs';

import { getDeclastructAwsProvider } from '../../../src/contract/sdks';
import { getResourcesOfSsm } from './resources.ssm';

// source aws credentials from keyrack
keyrack.source({ env: 'prep', owner: 'ehmpath', mode: 'lenient' });

const log = genLogMethods();

/**
 * .what = a params-only declastruct wish that declares JUST the demo SSM parameters
 * .why = the aggregate resources.ts wish bundles the whole demo stack (VPC/EC2/NAT/budget),
 *   which carries its own staged drift (a VPC CIDR re-range) + an unrelated cost-anomaly read
 *   error. this scoped wish lets us dogfood DeclaredAwsSsmParameter{Plain,Secure} in isolation —
 *   plan/apply exactly the two params, leave every other resource untouched.
 * .how = same recipe as resources.ts, but getResources returns ONLY getResourcesOfSsm():
 *   - FIRST create: supply the secret via env so the SecureString has a value —
 *       DECLASTRUCT_DEMO_SECRET=... npx declastruct plan  --wish this --into .temp/plan.ssm.json
 *       npx declastruct apply --plan .temp/plan.ssm.json
 *   - STEADY state: leave DECLASTRUCT_DEMO_SECRET UNSET -> both plan KEEP (the secret via
 *     metadata-only DescribeParameters — no GetParameter, no kms:Decrypt)
 */
export const getProviders = async (): Promise<DeclastructProvider[]> => [
  await getDeclastructAwsProvider({}, { log }),
];

export const getResources = async (): Promise<DomainEntity<any>[]> =>
  getResourcesOfSsm();
