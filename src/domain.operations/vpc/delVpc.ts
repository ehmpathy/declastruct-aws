import { DeleteVpcCommand, EC2Client } from '@aws-sdk/client-ec2';
import { asProcedure } from 'as-procedure';
import type { Ref } from 'domain-objects';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsVpc } from '@src/domain.objects/DeclaredAwsVpc';

import { getOneVpc } from './getOneVpc';

/**
 * .what = deletes a VPC
 * .why = enables cleanup of virtual private clouds
 *
 * .note
 *   - idempotent: no error if VPC doesn't exist
 *   - all dependent resources must be deleted first
 */
export const delVpc = asProcedure(
  async (
    input: {
      ref: Ref<typeof DeclaredAwsVpc>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<void> => {
    // create ec2 client
    const ec2 = new EC2Client({ region: context.aws.credentials.region });

    // lookup VPC to get id
    const vpc = await getOneVpc({ by: { ref: input.ref } }, context);

    // if absent, no work to do (idempotent)
    if (!vpc) return;

    // delete the VPC
    try {
      await ec2.send(
        new DeleteVpcCommand({
          VpcId: vpc.id,
        }),
      );
    } catch (error) {
      // ignore if already deleted
      if (error instanceof Error && error.name === 'InvalidVpcID.NotFound')
        return;
      throw error;
    }
  },
);
