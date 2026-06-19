import {
  CreateTagsCommand,
  CreateVpcCommand,
  EC2Client,
  ModifyVpcAttributeCommand,
} from '@aws-sdk/client-ec2';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsVpc } from '@src/domain.objects/DeclaredAwsVpc';

import { getOneVpc } from './getOneVpc';

/**
 * .what = creates or updates a VPC
 * .why = enables declarative VPC management with DNS and tags
 *
 * .note
 *   - findsert: creates if not found, returns foundBefore if found
 *   - upsert: creates if not found, updates DNS settings if found
 *   - CIDR cannot be changed after creation (AWS limitation)
 */
export const setVpc = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsVpc;
      upsert: DeclaredAwsVpc;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsVpc>> => {
    const vpcDesired = input.findsert ?? input.upsert;

    // create client
    const ec2 = new EC2Client({
      region: context.aws.credentials.region,
    });

    // check if VPC already exists
    const foundBefore = await getOneVpc(
      { by: { unique: { exid: vpcDesired.exid } } },
      context,
    );

    // handle findsert: if found, return it
    if (foundBefore && input.findsert) return foundBefore;

    // create VPC if not found, otherwise use extant id
    const vpcId = await (async (): Promise<string> => {
      if (foundBefore) return foundBefore.id;

      // failfast if cidr.v4 is not defined (required for VPC creation)
      if (!vpcDesired.cidr.v4)
        throw new UnexpectedCodePathError(
          'vpc cidr.v4 is required for creation',
          { vpcDesired },
        );

      const createResponse = await ec2.send(
        new CreateVpcCommand({
          CidrBlock: vpcDesired.cidr.v4,
          TagSpecifications: [
            {
              ResourceType: 'vpc',
              Tags: [
                { Key: 'exid', Value: vpcDesired.exid },
                ...(vpcDesired.tags
                  ? Object.entries(vpcDesired.tags).map(([key, value]) => ({
                      Key: key,
                      Value: value,
                    }))
                  : []),
              ],
            },
          ],
        }),
      );

      // failfast if VPC id is absent
      if (!createResponse.Vpc?.VpcId)
        return UnexpectedCodePathError.throw('vpc lacks id after create', {
          createResponse,
        });

      return createResponse.Vpc.VpcId;
    })();

    // update tags if upsert on extant
    if (foundBefore && input.upsert && vpcDesired.tags) {
      await ec2.send(
        new CreateTagsCommand({
          Resources: [vpcId],
          Tags: Object.entries(vpcDesired.tags).map(([key, value]) => ({
            Key: key,
            Value: value,
          })),
        }),
      );
    }

    // set DNS attributes (both for new and upsert)
    const shouldUpdateDns =
      !foundBefore ||
      (input.upsert &&
        (foundBefore.dns.hostnames !== vpcDesired.dns.hostnames ||
          foundBefore.dns.support !== vpcDesired.dns.support));

    if (shouldUpdateDns) {
      await Promise.all([
        ec2.send(
          new ModifyVpcAttributeCommand({
            VpcId: vpcId,
            EnableDnsHostnames: {
              Value: vpcDesired.dns.hostnames === 'enabled',
            },
          }),
        ),
        ec2.send(
          new ModifyVpcAttributeCommand({
            VpcId: vpcId,
            EnableDnsSupport: {
              Value: vpcDesired.dns.support === 'enabled',
            },
          }),
        ),
      ]);
    }

    // fetch and return the VPC
    const foundAfter = await getOneVpc(
      { by: { unique: { exid: vpcDesired.exid } } },
      context,
    );

    // failfast if not found after set
    if (!foundAfter)
      UnexpectedCodePathError.throw('vpc not found after set', { vpcDesired });

    return foundAfter;
  },
);
