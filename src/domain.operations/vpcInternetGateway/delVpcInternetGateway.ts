import {
  DeleteInternetGatewayCommand,
  DetachInternetGatewayCommand,
  EC2Client,
} from '@aws-sdk/client-ec2';
import { asProcedure } from 'as-procedure';
import type { Ref } from 'domain-objects';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsVpcInternetGateway } from '@src/domain.objects/DeclaredAwsVpcInternetGateway';
import { getOneVpcId } from '@src/domain.operations/vpc/getOneVpcId';

import { getOneVpcInternetGateway } from './getOneVpcInternetGateway';

/**
 * .what = deletes a VPC internet gateway
 * .why = enables cleanup of internet gateways
 *
 * .note
 *   - idempotent: no error if internet gateway doesn't exist
 *   - detaches from VPC before delete
 */
export const delVpcInternetGateway = asProcedure(
  async (
    input: {
      ref: Ref<typeof DeclaredAwsVpcInternetGateway>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<void> => {
    // create ec2 client
    const ec2 = new EC2Client({ region: context.aws.credentials.region });

    // lookup internet gateway to get id and vpc
    const igw = await getOneVpcInternetGateway(
      { by: { ref: input.ref } },
      context,
    );

    // if absent, no work to do (idempotent)
    if (!igw) return;

    // lookup VPC ID from ref
    const vpcId = await getOneVpcId({ vpc: igw.vpc }, context);

    // detach from VPC first (if attached)
    try {
      await ec2.send(
        new DetachInternetGatewayCommand({
          InternetGatewayId: igw.id,
          VpcId: vpcId,
        }),
      );
    } catch (error) {
      // rethrow if not Gateway.NotAttached error
      if (!(error instanceof Error && error.name === 'Gateway.NotAttached'))
        throw error;
      // otherwise continue to delete
    }

    // delete the internet gateway
    try {
      await ec2.send(
        new DeleteInternetGatewayCommand({
          InternetGatewayId: igw.id,
        }),
      );
    } catch (error) {
      // ignore if already deleted
      if (
        error instanceof Error &&
        error.name === 'InvalidInternetGatewayID.NotFound'
      )
        return;
      throw error;
    }
  },
);
