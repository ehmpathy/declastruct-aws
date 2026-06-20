import {
  AttachInternetGatewayCommand,
  CreateInternetGatewayCommand,
  CreateTagsCommand,
  EC2Client,
} from '@aws-sdk/client-ec2';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsVpcInternetGateway } from '@src/domain.objects/DeclaredAwsVpcInternetGateway';
import { getOneVpcId } from '@src/domain.operations/vpc/getOneVpcId';

import { getOneVpcInternetGateway } from './getOneVpcInternetGateway';

/**
 * .what = creates or updates a VPC internet gateway
 * .why = enables declarative internet gateway management with tags
 *
 * .note
 *   - findsert: creates if not found, returns foundBefore if found
 *   - upsert: creates if not found, updates tags if found
 *   - VPC attachment cannot be changed after creation (must detach/reattach)
 */
export const setVpcInternetGateway = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsVpcInternetGateway;
      upsert: DeclaredAwsVpcInternetGateway;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsVpcInternetGateway>> => {
    const igwDesired = input.findsert ?? input.upsert;

    // create client
    const ec2 = new EC2Client({
      region: context.aws.credentials.region,
    });

    // check if internet gateway already exists
    const foundBefore = await getOneVpcInternetGateway(
      { by: { unique: { exid: igwDesired.exid } } },
      context,
    );

    // handle findsert: if found, return it
    if (foundBefore && input.findsert) return foundBefore;

    // create internet gateway if not found, otherwise use extant id
    const igwId = await (async (): Promise<string> => {
      if (foundBefore) return foundBefore.id;

      const createResponse = await ec2.send(
        new CreateInternetGatewayCommand({
          TagSpecifications: [
            {
              ResourceType: 'internet-gateway',
              Tags: [
                { Key: 'exid', Value: igwDesired.exid },
                ...(igwDesired.tags
                  ? Object.entries(igwDesired.tags).map(([key, value]) => ({
                      Key: key,
                      Value: value,
                    }))
                  : []),
              ],
            },
          ],
        }),
      );

      // failfast if internet gateway id is absent
      if (!createResponse.InternetGateway?.InternetGatewayId)
        return UnexpectedCodePathError.throw(
          'internet gateway lacks id after create',
          { createResponse },
        );

      const newIgwId = createResponse.InternetGateway.InternetGatewayId;

      // lookup VPC id from ref
      const vpcId = await getOneVpcId({ vpc: igwDesired.vpc }, context);

      // attach to VPC
      await ec2.send(
        new AttachInternetGatewayCommand({
          InternetGatewayId: newIgwId,
          VpcId: vpcId,
        }),
      );

      return newIgwId;
    })();

    // update tags if upsert on extant
    if (foundBefore && input.upsert && igwDesired.tags) {
      await ec2.send(
        new CreateTagsCommand({
          Resources: [igwId],
          Tags: Object.entries(igwDesired.tags).map(([key, value]) => ({
            Key: key,
            Value: value,
          })),
        }),
      );
    }

    // fetch and return the internet gateway
    const foundAfter = await getOneVpcInternetGateway(
      { by: { unique: { exid: igwDesired.exid } } },
      context,
    );

    // failfast if not found after set
    if (!foundAfter)
      UnexpectedCodePathError.throw('internet gateway not found after set', {
        igwDesired,
      });

    return foundAfter;
  },
);
