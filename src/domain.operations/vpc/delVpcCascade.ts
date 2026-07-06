import {
  DeleteInternetGatewayCommand,
  DeleteRouteTableCommand,
  DeleteSecurityGroupCommand,
  DeleteSubnetCommand,
  DeleteVpcCommand,
  DescribeInternetGatewaysCommand,
  DescribeRouteTablesCommand,
  DescribeSecurityGroupsCommand,
  DescribeSubnetsCommand,
  DetachInternetGatewayCommand,
  DisassociateRouteTableCommand,
  EC2Client,
} from '@aws-sdk/client-ec2';
import { asProcedure } from 'as-procedure';
import type { RefByPrimary } from 'domain-objects';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsVpc } from '@src/domain.objects/DeclaredAwsVpc';

/** .what = swallow an aws "already gone" error so the teardown stays idempotent */
const ignoreIfNotFound = async (act: () => Promise<unknown>): Promise<void> => {
  try {
    await act();
  } catch (error) {
    if (error instanceof Error && /\.NotFound$/.test(error.name)) return;
    throw error;
  }
};

/**
 * .what = deletes a VPC together with all its dependent resources
 * .why = AWS refuses to delete a VPC while any dependent lingers, and offers no
 *   cascade. tests (and audits) that leak a VPC also leak its subnets, security
 *   groups, gateways, and route tables — this tears the whole tree down in the
 *   one safe order so a single leaked VPC never blocks the account's VPC quota.
 * .note
 *   - referenced by primary id (the sweep enumerates orphans by tag, whose exids
 *     are unknown, so id is the stable handle)
 *   - idempotent: absent dependents and an absent VPC are both no-ops
 *   - order = route tables (disassociate first) -> internet gateways (detach
 *     first) -> security groups (skip default) -> subnets -> the VPC itself
 */
export const delVpcCascade = asProcedure(
  async (
    input: {
      ref: RefByPrimary<typeof DeclaredAwsVpc>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<void> => {
    const ec2 = new EC2Client({ region: context.aws.credentials.region });
    const vpcId = input.ref.id;
    const byVpc = [{ Name: 'vpc-id', Values: [vpcId] }];

    // tear down route tables — disassociate non-main associations, then delete
    // the non-main tables (the main table is deleted with the VPC)
    const routeTables = await ec2.send(
      new DescribeRouteTablesCommand({ Filters: byVpc }),
    );
    for (const routeTable of routeTables.RouteTables ?? []) {
      const isMain = (routeTable.Associations ?? []).some(
        (assoc) => assoc.Main,
      );
      for (const assoc of routeTable.Associations ?? []) {
        if (assoc.Main || !assoc.RouteTableAssociationId) continue;
        await ignoreIfNotFound(() =>
          ec2.send(
            new DisassociateRouteTableCommand({
              AssociationId: assoc.RouteTableAssociationId,
            }),
          ),
        );
      }
      if (isMain || !routeTable.RouteTableId) continue;
      await ignoreIfNotFound(() =>
        ec2.send(
          new DeleteRouteTableCommand({
            RouteTableId: routeTable.RouteTableId,
          }),
        ),
      );
    }

    // tear down internet gateways — detach from the VPC, then delete
    const gateways = await ec2.send(
      new DescribeInternetGatewaysCommand({
        Filters: [{ Name: 'attachment.vpc-id', Values: [vpcId] }],
      }),
    );
    for (const gateway of gateways.InternetGateways ?? []) {
      if (!gateway.InternetGatewayId) continue;
      await ignoreIfNotFound(() =>
        ec2.send(
          new DetachInternetGatewayCommand({
            InternetGatewayId: gateway.InternetGatewayId,
            VpcId: vpcId,
          }),
        ),
      );
      await ignoreIfNotFound(() =>
        ec2.send(
          new DeleteInternetGatewayCommand({
            InternetGatewayId: gateway.InternetGatewayId,
          }),
        ),
      );
    }

    // tear down security groups — skip the default group (deleted with the VPC)
    const securityGroups = await ec2.send(
      new DescribeSecurityGroupsCommand({ Filters: byVpc }),
    );
    for (const group of securityGroups.SecurityGroups ?? []) {
      if (group.GroupName === 'default' || !group.GroupId) continue;
      await ignoreIfNotFound(() =>
        ec2.send(new DeleteSecurityGroupCommand({ GroupId: group.GroupId })),
      );
    }

    // tear down subnets
    const subnets = await ec2.send(
      new DescribeSubnetsCommand({ Filters: byVpc }),
    );
    for (const subnet of subnets.Subnets ?? []) {
      if (!subnet.SubnetId) continue;
      await ignoreIfNotFound(() =>
        ec2.send(new DeleteSubnetCommand({ SubnetId: subnet.SubnetId })),
      );
    }

    // finally, delete the VPC itself
    await ignoreIfNotFound(() =>
      ec2.send(new DeleteVpcCommand({ VpcId: vpcId })),
    );
  },
);
