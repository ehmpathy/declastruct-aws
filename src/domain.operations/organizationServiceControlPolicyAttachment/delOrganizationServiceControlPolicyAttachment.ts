import {
  DetachPolicyCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { asProcedure } from 'as-procedure';
import { BadRequestError, HelpfulError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsOrganizationServiceControlPolicyAttachment } from '@src/domain.objects/DeclaredAwsOrganizationServiceControlPolicyAttachment';
import { getOneOrganizationServiceControlPolicy } from '@src/domain.operations/organizationServiceControlPolicy/getOneOrganizationServiceControlPolicy';

import { asTargetId } from './asTargetId';

/**
 * .what = detaches an SCP from a target (org root or account)
 * .why = enables declarative attachment management
 * .note
 *   - idempotent: returns success if not attached
 *   - PolicyNotAttachedException treated as success
 */
export const delOrganizationServiceControlPolicyAttachment = asProcedure(
  async (
    input: {
      by: {
        unique: Pick<
          DeclaredAwsOrganizationServiceControlPolicyAttachment,
          'policy' | 'target'
        >;
      };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<{ deleted: true }> => {
    // declare the client
    const client = new OrganizationsClient({
      region: context.aws.credentials.region,
    });

    // lookup the policy to get its id
    const policy = await getOneOrganizationServiceControlPolicy(
      { by: { unique: input.by.unique.policy } },
      context,
    );

    // idempotent: policy absent, already detached
    if (!policy) return { deleted: true };

    // derive target id (org root or account)
    const targetId = await asTargetId({
      target: input.by.unique.target,
      context,
    });

    // idempotent: target absent, already detached
    if (!targetId) return { deleted: true };

    try {
      // detach the policy
      await client.send(
        new DetachPolicyCommand({
          PolicyId: policy.id,
          TargetId: targetId,
        }),
      );

      return { deleted: true };
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // idempotent: not attached
      if (error.name === 'PolicyNotAttachedException') return { deleted: true };

      // cannot detach the last SCP from root
      if (error.name === 'PolicyInUseException') {
        BadRequestError.throw(
          'cannot detach: this is the last SCP attached to root',
          {
            hint: 'at least one SCP must remain attached to root',
            input,
          },
        );
      }

      throw new HelpfulError(
        'aws.delOrganizationServiceControlPolicyAttachment error',
        {
          cause: error,
          context: {
            errorName: error.name,
            errorMessage: error.message,
            input,
          },
        },
      );
    }
  },
);
