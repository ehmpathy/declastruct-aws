import {
  AssociateRouteTableCommand,
  DescribeRouteTablesCommand,
  DisassociateRouteTableCommand,
  type EC2Client,
} from '@aws-sdk/client-ec2';
import { BadRequestError } from 'helpful-errors';

import { getResourceOwnershipVerdict } from '@src/infra/ownership/getResourceOwnershipVerdict';

/**
 * .what = reconciles a route table's subnet associations to exactly the desired set
 * .why = AWS subnet associations are not idempotent, so a naive associate cannot be
 *   re-run safely:
 *     - AssociateRouteTable throws `Resource.AlreadyAssociated` if the subnet already
 *       holds an association (a subnet can belong to only one route table)
 *     - so "associate every desired subnet" fails on the second apply, and blanket
 *       tolerance of the conflict would hide a subnet still bound to the wrong table
 *   to make set idempotent we reconcile: keep associations already correct, move a
 *   subnet held by an unowned/our table onto ours, and drop associations no longer
 *   desired.
 * .note
 *   - AssociationId is required to disassociate but is absent from our domain model, so
 *     we read it fresh from AWS here rather than trust the passed-in state
 *   - the holder-table's exid tag is an ownership marker. `subnet-id` is a SUBSET of an
 *     association's identity (which table it points at), so a subnet held by a FOREIGN
 *     table is another declaration's association — we must NOT yank it onto ours (that
 *     silently reroutes another owner's traffic). we classify the holder's exid and fail
 *     loud on a foreign owner — see rule.forbid.silent-resource-theft
 */
export const setVpcRouteTableAssociations = async (input: {
  ec2: EC2Client;
  routeTableId: string;
  routeTableExid: string;
  subnetIds: string[];
}): Promise<void> => {
  // read our route table's current associations, with their association ids
  const describeOurs = await input.ec2.send(
    new DescribeRouteTablesCommand({
      Filters: [{ Name: 'route-table-id', Values: [input.routeTableId] }],
    }),
  );
  const associationsOurs = (
    describeOurs.RouteTables?.[0]?.Associations ?? []
  ).filter((assoc) => !assoc.Main && assoc.SubnetId);

  // drop our associations that are no longer desired
  for (const assoc of associationsOurs) {
    if (input.subnetIds.includes(assoc.SubnetId!)) continue;
    if (!assoc.RouteTableAssociationId) continue;
    await input.ec2.send(
      new DisassociateRouteTableCommand({
        AssociationId: assoc.RouteTableAssociationId,
      }),
    );
  }

  // ensure each desired subnet is associated with our route table
  for (const subnetId of input.subnetIds) {
    // skip if the subnet is already associated with our route table
    const alreadyOurs = associationsOurs.some((a) => a.SubnetId === subnetId);
    if (alreadyOurs) continue;

    // if the subnet is bound to a different route table, disassociate it first —
    // but ONLY if that table is unowned or ours. a foreign-owned holder means another
    // declaration routes this subnet; yank it and we silently reroute their traffic
    const describeHolders = await input.ec2.send(
      new DescribeRouteTablesCommand({
        Filters: [{ Name: 'association.subnet-id', Values: [subnetId] }],
      }),
    );
    for (const rtb of describeHolders.RouteTables ?? []) {
      const held = (rtb.Associations ?? []).find(
        (a) => !a.Main && a.SubnetId === subnetId && a.RouteTableAssociationId,
      );
      if (!held?.RouteTableAssociationId) continue;

      // classify the holder table's ownership before we move the subnet off it
      const exidDetected = rtb.Tags?.find((tag) => tag.Key === 'exid')?.Value;
      const verdict = getResourceOwnershipVerdict({
        exidDetected,
        exidExpected: input.routeTableExid,
      });

      // fail loud on a foreign owner — never reroute another declaration's subnet
      if (verdict === 'foreign')
        BadRequestError.throw(
          `subnet ${subnetId} is already associated with route table ${rtb.RouteTableId} owned by exid="${exidDetected}". it cannot be moved onto exid="${input.routeTableExid}". fix by one of: remove the association from the other declaration first, or reconcile the two declarations to a single owner`,
          {
            subnetId,
            routeTableIdHolder: rtb.RouteTableId,
            exidDetected,
            exidExpected: input.routeTableExid,
          },
        );

      // unowned (or already ours) — safe to move the subnet onto our table
      await input.ec2.send(
        new DisassociateRouteTableCommand({
          AssociationId: held.RouteTableAssociationId,
        }),
      );
    }

    // associate the subnet with our route table
    await input.ec2.send(
      new AssociateRouteTableCommand({
        RouteTableId: input.routeTableId,
        SubnetId: subnetId,
      }),
    );
  }
};
