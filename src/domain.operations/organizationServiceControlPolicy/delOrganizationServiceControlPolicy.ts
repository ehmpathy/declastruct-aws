import {
  DeletePolicyCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { asProcedure } from 'as-procedure';
import {
  isRefByPrimary,
  isRefByUnique,
  type Ref,
  type RefByPrimary,
  type RefByUnique,
} from 'domain-objects';
import { BadRequestError, HelpfulError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsOrganizationServiceControlPolicy } from '@src/domain.objects/DeclaredAwsOrganizationServiceControlPolicy';

import { getOneOrganizationServiceControlPolicy } from './getOneOrganizationServiceControlPolicy';

/**
 * .what = deletes an SCP from the organization
 * .why = enables removal of policies
 * .note
 *   - idempotent: returns success if policy not found
 *   - fails if policy is still attached to any target
 *   - detach from all targets before delete
 */
export const delOrganizationServiceControlPolicy = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<
          typeof DeclaredAwsOrganizationServiceControlPolicy
        >;
        unique: RefByUnique<typeof DeclaredAwsOrganizationServiceControlPolicy>;
        ref: Ref<typeof DeclaredAwsOrganizationServiceControlPolicy>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<{ deleted: true }> => {
    // derive by structure from input
    const by = (() => {
      if (input.by.primary) return { primary: input.by.primary };
      if (input.by.unique) return { unique: input.by.unique };
      if (input.by.ref) {
        if (
          isRefByUnique({ of: DeclaredAwsOrganizationServiceControlPolicy })(
            input.by.ref,
          )
        )
          return { unique: input.by.ref };
        if (
          isRefByPrimary({ of: DeclaredAwsOrganizationServiceControlPolicy })(
            input.by.ref,
          )
        )
          return { primary: input.by.ref };
      }
      BadRequestError.throw('ref is neither unique nor primary', { input });
    })();

    // declare the client
    const client = new OrganizationsClient({
      region: context.aws.credentials.region,
    });

    try {
      // lookup policy to get id
      const policy = await getOneOrganizationServiceControlPolicy(
        { by },
        context,
      );

      // idempotent: already deleted
      if (!policy) return { deleted: true };

      // delete the policy
      await client.send(
        new DeletePolicyCommand({
          PolicyId: policy.id,
        }),
      );

      return { deleted: true };
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // idempotent: policy not found
      if (error.name === 'PolicyNotFoundException') return { deleted: true };

      // policy still attached
      if (error.name === 'PolicyInUseException') {
        BadRequestError.throw(
          'cannot delete policy: still attached to targets',
          {
            hint: 'detach policy from all targets before delete',
            input,
          },
        );
      }

      throw new HelpfulError('aws.delOrganizationServiceControlPolicy error', {
        cause: error,
        context: {
          errorName: error.name,
          errorMessage: error.message,
          input,
        },
      });
    }
  },
);
