import { keyrack } from 'rhachet/keyrack';
import { genLogMethods } from 'sdk-logs';

import {
  delVpcRouteTable,
  delVpcSubnet,
  getDeclastructAwsProvider,
} from '../../../src/contract/sdks';

// source aws credentials from keyrack
keyrack.source({ env: 'prep', owner: 'ehmpath', mode: 'lenient' });

const log = genLogMethods();

/**
 * .what = prune superseded VPC orphans from the prior single-subnet demo shape
 * .why = the prior shape declared `declastruct-demo-subnet-1a` (10.0.1.0/24) and
 *        `declastruct-demo-rt`; the new public/private split renamed them, so they
 *        are absent from desired state and block the new public subnet's CIDR
 */
const cleanup = async () => {
  const provider = await getDeclastructAwsProvider({}, { log });
  const context = provider.context;

  // delete the old route table first (releases its subnet association)
  log.info('delete old route table declastruct-demo-rt...');
  await delVpcRouteTable({ ref: { exid: 'declastruct-demo-rt' } }, context);

  // delete the old subnet (frees 10.0.1.0/24 for the new public subnet)
  log.info('delete old subnet declastruct-demo-subnet-1a...');
  await delVpcSubnet({ ref: { exid: 'declastruct-demo-subnet-1a' } }, context);

  log.info('cleanup complete');
};

cleanup().catch(console.error);
