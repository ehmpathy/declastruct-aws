import {
  DeleteNetworkInterfaceCommand,
  DescribeNetworkInterfacesCommand,
  DescribeSubnetsCommand,
  EC2Client,
} from '@aws-sdk/client-ec2';
import { keyrack } from 'rhachet/keyrack';
import { genLogMethods } from 'sdk-logs';

import {
  delVpcRouteTable,
  delVpcSubnet,
  getDeclastructAwsProvider,
} from '../../../src/contract/sdks';

const log = genLogMethods();

/**
 * .what = prunes a stale VPC subnet + its route table from the demo account
 * .why = a subnet's natural key is (vpc, cidr), a SUBSET of its identity. when a
 *   fixture renames a subnet (e.g. the #59 single-subnet -> public/private split),
 *   the old subnet becomes an orphan that still holds the cidr the new subnet wants.
 *   the ownership gate now fails loud on that foreign-exid orphan instead of a silent
 *   steal (rule.forbid.silent-resource-theft), so the orphan must be pruned first.
 *   this deletes the old route table (releases its subnet association) then the old
 *   subnet (frees the cidr), so a fresh apply recreates the new subnet clean.
 *
 * .usage = invoked via aws.prune.vpc.sh (unlocks keyrack + sources profile, then runs this)
 *   # defaults: the stale acceptance orphans from the pre-#59 single-subnet shape
 *   ./provision/aws.infra/account=demo/aws.prune.vpc.sh
 *
 *   # explicit target exids
 *   ./provision/aws.infra/account=demo/aws.prune.vpc.sh \
 *     --subnet declastruct-acceptance-subnet-1a \
 *     --route-table declastruct-acceptance-rtb
 *
 * .note = delVpcRouteTable / delVpcSubnet are idempotent — a no-op if absent
 */
const prune = async () => {
  // source the demo profile from keyrack, exactly as the acceptance harness does
  // .note = lenient when aws creds already present (e.g. ci oidc or a sourced profile)
  const hasAwsCredentials = !!(
    process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE
  );
  keyrack.source({
    env: 'test',
    owner: 'ehmpath',
    mode: hasAwsCredentials ? 'lenient' : 'strict',
  });

  const provider = await getDeclastructAwsProvider({}, { log });
  const context = provider.context;

  // derive target exids from args, default to the stale acceptance orphans
  const args = process.argv.slice(2);
  const argAfter = (flag: string): string | null => {
    const at = args.indexOf(flag);
    if (at === -1) return null;
    return args[at + 1] ?? null;
  };
  const subnetExid = argAfter('--subnet') ?? 'declastruct-acceptance-subnet-1a';
  const routeTableExid =
    argAfter('--route-table') ?? 'declastruct-acceptance-rtb';

  // prune the route table first (releases its subnet association)
  log.info('prune route table...', { routeTableExid });
  await delVpcRouteTable({ ref: { exid: routeTableExid } }, context);

  // delete any detached (available) ENIs left in the subnet before the subnet
  // delete. terminated instances can leave orphan ENIs behind (e.g. a NAT's
  // secondary interface with DeleteOnTermination=false); these are detached and
  // safe to delete, and they block the subnet delete until removed.
  const ec2 = new EC2Client({ region: context.aws.credentials.region });
  const subnetsForEni = await ec2.send(
    new DescribeSubnetsCommand({
      Filters: [{ Name: 'tag:exid', Values: [subnetExid] }],
    }),
  );
  const subnetIdForEni = subnetsForEni.Subnets?.[0]?.SubnetId;
  if (subnetIdForEni) {
    const enisExtant = await ec2.send(
      new DescribeNetworkInterfacesCommand({
        Filters: [{ Name: 'subnet-id', Values: [subnetIdForEni] }],
      }),
    );
    const enisDetached = (enisExtant.NetworkInterfaces ?? []).filter(
      (eni) => eni.Status === 'available' && eni.NetworkInterfaceId,
    );
    for (const eni of enisDetached) {
      log.info('delete detached eni...', { eni: eni.NetworkInterfaceId });
      try {
        await ec2.send(
          new DeleteNetworkInterfaceCommand({
            NetworkInterfaceId: eni.NetworkInterfaceId,
          }),
        );
      } catch (error) {
        // aws auto-releases a detached eni shortly after its instance terminates,
        // so a NotFound between describe and delete means it is already gone —
        // idempotent success. rethrow every other error.
        if (
          !(error instanceof Error) ||
          error.name !== 'InvalidNetworkInterfaceID.NotFound'
        )
          throw error;
      }
    }
  }

  // prune the subnet (frees its cidr for the renamed subnet)
  log.info('prune subnet...', { subnetExid });
  try {
    await delVpcSubnet({ ref: { exid: subnetExid } }, context);
  } catch (error) {
    // a DependencyViolation means a live resource (an ENI, usually attached to an
    // instance) still sits in the subnet. describe those ENIs and log their
    // attachments so the blocker is named, not guessed — then rethrow to fail loud.
    if (!(error instanceof Error) || error.name !== 'DependencyViolation')
      throw error;

    const ec2 = new EC2Client({ region: context.aws.credentials.region });
    const subnets = await ec2.send(
      new DescribeSubnetsCommand({
        Filters: [{ Name: 'tag:exid', Values: [subnetExid] }],
      }),
    );
    const subnetId = subnets.Subnets?.[0]?.SubnetId;
    const enis = await ec2.send(
      new DescribeNetworkInterfacesCommand({
        Filters: [{ Name: 'subnet-id', Values: [subnetId ?? ''] }],
      }),
    );
    log.warn('subnet has dependencies — cannot delete', {
      subnetExid,
      subnetId,
      dependents: (enis.NetworkInterfaces ?? []).map((eni) => ({
        eni: eni.NetworkInterfaceId,
        status: eni.Status,
        description: eni.Description,
        instanceId: eni.Attachment?.InstanceId ?? null,
        interfaceType: eni.InterfaceType,
      })),
    });
    throw error;
  }

  log.info('prune complete');
};

prune().catch(console.error);
