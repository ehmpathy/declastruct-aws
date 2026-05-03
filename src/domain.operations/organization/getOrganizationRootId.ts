import {
  ListRootsCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { asProcedure } from 'as-procedure';
import { HelpfulError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

/**
 * .what = retrieves the organization root ID
 * .why = enables SCP attachment to org root without eager fetch overhead
 * .note
 *   - only fetches root ID, not the full organization
 *   - used by SCP attachment for org root target
 *   - returns null if caller is not in an organization
 */
export const getOrganizationRootId = asProcedure(
  async (
    input: {
      by: { auth: true };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<string | null> => {
    // declare the client
    const client = new OrganizationsClient({
      region: context.aws.credentials.region,
    });

    try {
      // fetch the root ID via ListRoots API
      const response = await client.send(new ListRootsCommand({}));
      const root = response.Roots?.[0];

      if (!root?.Id) return null;

      return root.Id;
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // handle not in organization
      if (error.name === 'AWSOrganizationsNotInUseException') return null;

      throw new HelpfulError('aws.getOrganizationRootId error', {
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
