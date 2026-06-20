import { DeleteSecurityGroupCommand, EC2Client } from '@aws-sdk/client-ec2';
import { asProcedure } from 'as-procedure';
import type { Ref } from 'domain-objects';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsVpcSecurityGroup } from '@src/domain.objects/DeclaredAwsVpcSecurityGroup';

import { getOneVpcSecurityGroup } from './getOneVpcSecurityGroup';

/**
 * .what = deletes a VPC security group
 * .why = enables cleanup of firewall rules
 *
 * .note
 *   - idempotent: no error if security group doesn't exist
 *   - all dependent resources must be updated first
 */
export const delVpcSecurityGroup = asProcedure(
  async (
    input: {
      ref: Ref<typeof DeclaredAwsVpcSecurityGroup>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<void> => {
    // create ec2 client
    const ec2 = new EC2Client({ region: context.aws.credentials.region });

    // lookup security group to get id
    const sg = await getOneVpcSecurityGroup(
      { by: { ref: input.ref } },
      context,
    );

    // if absent, no work to do (idempotent)
    if (!sg) return;

    // delete the security group
    try {
      await ec2.send(
        new DeleteSecurityGroupCommand({
          GroupId: sg.id,
        }),
      );
    } catch (error) {
      // ignore if already deleted
      if (error instanceof Error && error.name === 'InvalidGroup.NotFound')
        return;
      throw error;
    }
  },
);
