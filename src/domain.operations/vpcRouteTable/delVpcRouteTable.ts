import {
  DeleteRouteTableCommand,
  DescribeRouteTablesCommand,
  DisassociateRouteTableCommand,
  EC2Client,
} from '@aws-sdk/client-ec2';
import { asProcedure } from 'as-procedure';
import type { Ref } from 'domain-objects';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsVpcRouteTable } from '@src/domain.objects/DeclaredAwsVpcRouteTable';

import { getOneVpcRouteTable } from './getOneVpcRouteTable';

/**
 * .what = deletes a VPC route table
 * .why = enables cleanup of route tables
 *
 * .note
 *   - idempotent: no error if route table doesn't exist
 *   - automatically disassociates all subnet associations before delete
 */
export const delVpcRouteTable = asProcedure(
  async (
    input: {
      ref: Ref<typeof DeclaredAwsVpcRouteTable>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<void> => {
    // create ec2 client
    const ec2 = new EC2Client({ region: context.aws.credentials.region });

    // lookup route table to get id
    const rt = await getOneVpcRouteTable({ by: { ref: input.ref } }, context);

    // if absent, no work to do (idempotent)
    if (!rt) return;

    // fetch raw associations from AWS to get association IDs
    // note: association IDs are not part of the domain model (metadata)
    const describeResponse = await ec2.send(
      new DescribeRouteTablesCommand({
        RouteTableIds: [rt.id],
      }),
    );
    const rawAssociations =
      describeResponse.RouteTables?.[0]?.Associations ?? [];

    // disassociate all non-main subnet associations before delete
    for (const assoc of rawAssociations) {
      if (assoc.Main) continue; // skip main association (cannot be disassociated)
      if (!assoc.RouteTableAssociationId) continue;
      try {
        await ec2.send(
          new DisassociateRouteTableCommand({
            AssociationId: assoc.RouteTableAssociationId,
          }),
        );
      } catch (error) {
        // ignore if already disassociated
        if (
          error instanceof Error &&
          error.name === 'InvalidAssociationID.NotFound'
        )
          continue;
        throw error;
      }
    }

    // delete the route table
    try {
      await ec2.send(
        new DeleteRouteTableCommand({
          RouteTableId: rt.id,
        }),
      );
    } catch (error) {
      // ignore if already deleted
      if (
        error instanceof Error &&
        error.name === 'InvalidRouteTableID.NotFound'
      )
        return;
      throw error;
    }
  },
);
