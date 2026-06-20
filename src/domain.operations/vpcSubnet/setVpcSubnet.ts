import {
  CreateSubnetCommand,
  CreateTagsCommand,
  EC2Client,
} from '@aws-sdk/client-ec2';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsVpcSubnet } from '@src/domain.objects/DeclaredAwsVpcSubnet';
import { getOneVpcId } from '@src/domain.operations/vpc/getOneVpcId';

import { getOneVpcSubnet } from './getOneVpcSubnet';

/**
 * .what = creates or updates a VPC subnet
 * .why = enables declarative subnet management with tags
 *
 * .note
 *   - findsert: creates if not found, returns foundBefore if found
 *   - upsert: creates if not found, updates tags if found
 *   - CIDR and AZ cannot be changed after creation (AWS limitation)
 */
export const setVpcSubnet = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsVpcSubnet;
      upsert: DeclaredAwsVpcSubnet;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsVpcSubnet>> => {
    const subnetDesired = input.findsert ?? input.upsert;

    // create client
    const ec2 = new EC2Client({
      region: context.aws.credentials.region,
    });

    // check if subnet already exists
    const foundBefore = await getOneVpcSubnet(
      { by: { unique: { exid: subnetDesired.exid } } },
      context,
    );

    // handle findsert: if found, return it
    if (foundBefore && input.findsert) return foundBefore;

    // create subnet if not found, otherwise use extant id
    const subnetId = await (async (): Promise<string> => {
      if (foundBefore) return foundBefore.id;

      // lookup VPC id from ref
      const vpcId = await getOneVpcId({ vpc: subnetDesired.vpc }, context);

      const createResponse = await ec2.send(
        new CreateSubnetCommand({
          VpcId: vpcId,
          CidrBlock: subnetDesired.cidr.v4,
          AvailabilityZone: subnetDesired.zone.availability,
          TagSpecifications: [
            {
              ResourceType: 'subnet',
              Tags: [
                { Key: 'exid', Value: subnetDesired.exid },
                ...(subnetDesired.tags
                  ? Object.entries(subnetDesired.tags).map(([key, value]) => ({
                      Key: key,
                      Value: value,
                    }))
                  : []),
              ],
            },
          ],
        }),
      );

      // failfast if subnet id is absent
      if (!createResponse.Subnet?.SubnetId)
        return UnexpectedCodePathError.throw('subnet lacks id after create', {
          createResponse,
        });

      return createResponse.Subnet.SubnetId;
    })();

    // update tags if upsert on extant
    if (foundBefore && input.upsert && subnetDesired.tags) {
      await ec2.send(
        new CreateTagsCommand({
          Resources: [subnetId],
          Tags: Object.entries(subnetDesired.tags).map(([key, value]) => ({
            Key: key,
            Value: value,
          })),
        }),
      );
    }

    // fetch and return the subnet
    const foundAfter = await getOneVpcSubnet(
      { by: { unique: { exid: subnetDesired.exid } } },
      context,
    );

    // failfast if not found after set
    if (!foundAfter)
      UnexpectedCodePathError.throw('subnet not found after set', {
        subnetDesired,
      });

    return foundAfter;
  },
);
