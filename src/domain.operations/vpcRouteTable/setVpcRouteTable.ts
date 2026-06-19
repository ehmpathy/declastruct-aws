import {
  AssociateRouteTableCommand,
  CreateRouteCommand,
  CreateRouteTableCommand,
  CreateTagsCommand,
  DeleteRouteCommand,
  EC2Client,
} from '@aws-sdk/client-ec2';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsVpcRouteTable } from '@src/domain.objects/DeclaredAwsVpcRouteTable';
import { getOneVpcId } from '@src/domain.operations/vpc/getOneVpcId';
import { getOneVpcInternetGatewayId } from '@src/domain.operations/vpcInternetGateway/getOneVpcInternetGatewayId';
import { getOneVpcSubnetId } from '@src/domain.operations/vpcSubnet/getOneVpcSubnetId';

import { getOneVpcRouteTable } from './getOneVpcRouteTable';

/**
 * .what = creates or updates a VPC route table
 * .why = enables declarative route table management with routes and associations
 *
 * .note
 *   - findsert: creates if not found, returns foundBefore if found
 *   - upsert: creates if not found, syncs routes and associations if found
 *   - VPC cannot be changed after creation (AWS limitation)
 */
export const setVpcRouteTable = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsVpcRouteTable;
      upsert: DeclaredAwsVpcRouteTable;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsVpcRouteTable>> => {
    const rtDesired = input.findsert ?? input.upsert;

    // create client
    const ec2 = new EC2Client({
      region: context.aws.credentials.region,
    });

    // check if route table already exists
    const foundBefore = await getOneVpcRouteTable(
      { by: { unique: { exid: rtDesired.exid } } },
      context,
    );

    // handle findsert: if found, return it
    if (foundBefore && input.findsert) return foundBefore;

    // failfast if upsert would need to sync extant associations
    // note: association sync requires DisassociateRouteTable with AssociationId,
    //       which is not stored in the domain model
    if (foundBefore && input.upsert && foundBefore.associations.length > 0)
      throw new BadRequestError(
        'upsert with extant associations not yet supported; association sync requires AssociationId which is not captured in domain model',
        {
          extantAssociations: foundBefore.associations,
          desiredAssociations: rtDesired.associations,
        },
      );

    // create route table if not found, otherwise use extant id
    const rtId = await (async (): Promise<string> => {
      if (foundBefore) return foundBefore.id;

      // lookup VPC id from ref
      const vpcId = await getOneVpcId({ vpc: rtDesired.vpc }, context);

      const createResponse = await ec2.send(
        new CreateRouteTableCommand({
          VpcId: vpcId,
          TagSpecifications: [
            {
              ResourceType: 'route-table',
              Tags: [
                { Key: 'exid', Value: rtDesired.exid },
                ...(rtDesired.tags
                  ? Object.entries(rtDesired.tags).map(([key, value]) => ({
                      Key: key,
                      Value: value,
                    }))
                  : []),
              ],
            },
          ],
        }),
      );

      // failfast if route table id is absent
      if (!createResponse.RouteTable?.RouteTableId)
        return UnexpectedCodePathError.throw(
          'route table lacks id after create',
          { createResponse },
        );

      return createResponse.RouteTable.RouteTableId;
    })();

    // update tags if upsert on extant
    if (foundBefore && input.upsert && rtDesired.tags) {
      await ec2.send(
        new CreateTagsCommand({
          Resources: [rtId],
          Tags: Object.entries(rtDesired.tags).map(([key, value]) => ({
            Key: key,
            Value: value,
          })),
        }),
      );
    }

    // sync routes (for new or upsert)
    const shouldSyncRoutes = !foundBefore || input.upsert;

    if (shouldSyncRoutes) {
      // delete current routes if upsert (except local routes)
      if (foundBefore && input.upsert) {
        for (const route of foundBefore.routes) {
          // failfast if route has no cidr (should never happen for valid routes)
          if (!route.destination.cidr.v4 && !route.destination.cidr.v6)
            throw new UnexpectedCodePathError(
              'extant route lacks destination cidr; cannot delete',
              { route },
            );

          await ec2.send(
            new DeleteRouteCommand({
              RouteTableId: rtId,
              DestinationCidrBlock: route.destination.cidr.v4,
              DestinationIpv6CidrBlock: route.destination.cidr.v6,
            }),
          );
        }
      }

      // add desired routes
      for (const route of rtDesired.routes) {
        // failfast if no CIDR defined
        if (!route.destination.cidr.v4 && !route.destination.cidr.v6)
          throw new UnexpectedCodePathError('route lacks destination cidr', {
            route,
          });

        const targetId = await (async (): Promise<{
          GatewayId?: string;
          NatGatewayId?: string;
        }> => {
          // extract internet gateway AWS id from ref
          if (route.target.gatewayInternet) {
            const gatewayId = await getOneVpcInternetGatewayId(
              { gateway: route.target.gatewayInternet },
              context,
            );
            return { GatewayId: gatewayId };
          }

          // NAT gateway uses AWS id directly
          if (route.target.gatewayNat) {
            return { NatGatewayId: route.target.gatewayNat.id };
          }

          throw new UnexpectedCodePathError('route lacks target', { route });
        })();

        await ec2.send(
          new CreateRouteCommand({
            RouteTableId: rtId,
            DestinationCidrBlock: route.destination.cidr.v4,
            DestinationIpv6CidrBlock: route.destination.cidr.v6,
            ...targetId,
          }),
        );
      }

      // add desired associations
      for (const assoc of rtDesired.associations) {
        const subnetId = await getOneVpcSubnetId(
          { subnet: assoc.subnet },
          context,
        );
        await ec2.send(
          new AssociateRouteTableCommand({
            RouteTableId: rtId,
            SubnetId: subnetId,
          }),
        );
      }
    }

    // fetch and return the route table
    const foundAfter = await getOneVpcRouteTable(
      { by: { unique: { exid: rtDesired.exid } } },
      context,
    );

    // failfast if not found after set
    if (!foundAfter)
      UnexpectedCodePathError.throw('route table not found after set', {
        rtDesired,
      });

    return foundAfter;
  },
);
