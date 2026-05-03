import {
  DisablePolicyTypeCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { asProcedure } from 'as-procedure';
import type { RefByUnique } from 'domain-objects';
import { HelpfulError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsOrganizationPolicyEligibility } from '@src/domain.objects/DeclaredAwsOrganizationPolicyEligibility';
import { getOrganizationRootId } from '@src/domain.operations/organization/getOrganizationRootId';

import { getOneOrganizationPolicyEligibility } from './getOneOrganizationPolicyEligibility';

/**
 * .what = disables a policy type in the organization
 * .why = cleanup when policy type is no longer needed
 * .note
 *   - idempotent: returns { deleted: true } even if already disabled
 *   - PolicyEligibilityNotEnabledException treated as success
 *   - all policies of this type must be detached first
 */
export const delOrganizationPolicyEligibility = asProcedure(
  async (
    input: {
      by: {
        unique: RefByUnique<typeof DeclaredAwsOrganizationPolicyEligibility>;
      };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<{ deleted: true }> => {
    // check if enabled
    const found = await getOneOrganizationPolicyEligibility(input, context);
    if (!found) return { deleted: true }; // already disabled

    const client = new OrganizationsClient({
      region: context.aws.credentials.region,
    });

    // get root id for disable call
    const rootId = await getOrganizationRootId({ by: { auth: true } }, context);
    if (!rootId) {
      throw new HelpfulError('not in an organization', { context: { input } });
    }

    try {
      await client.send(
        new DisablePolicyTypeCommand({
          RootId: rootId,
          PolicyType: input.by.unique.type,
        }),
      );

      return { deleted: true };
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // idempotent: already disabled
      if (error.name === 'PolicyTypeNotEnabledException') {
        return { deleted: true };
      }

      throw new HelpfulError('aws.delOrganizationPolicyEligibility error', {
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
