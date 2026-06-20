import { DeleteSubnetCommand, EC2Client } from '@aws-sdk/client-ec2';
import { asProcedure } from 'as-procedure';
import type { Ref } from 'domain-objects';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsVpcSubnet } from '@src/domain.objects/DeclaredAwsVpcSubnet';

import { getOneVpcSubnet } from './getOneVpcSubnet';

/**
 * .what = deletes a VPC subnet
 * .why = enables cleanup of network segments
 *
 * .note
 *   - idempotent: no error if subnet doesn't exist
 *   - all resources in the subnet must be terminated first
 */
export const delVpcSubnet = asProcedure(
  async (
    input: {
      ref: Ref<typeof DeclaredAwsVpcSubnet>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<void> => {
    // create ec2 client
    const ec2 = new EC2Client({ region: context.aws.credentials.region });

    // lookup subnet to get id
    const subnet = await getOneVpcSubnet({ by: { ref: input.ref } }, context);

    // if absent, no work to do (idempotent)
    if (!subnet) return;

    // delete the subnet
    try {
      await ec2.send(
        new DeleteSubnetCommand({
          SubnetId: subnet.id,
        }),
      );
    } catch (error) {
      // ignore if already deleted
      if (error instanceof Error && error.name === 'InvalidSubnetID.NotFound')
        return;
      throw error;
    }
  },
);
