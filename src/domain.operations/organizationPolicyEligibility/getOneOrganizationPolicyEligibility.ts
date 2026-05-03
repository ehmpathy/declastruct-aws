import {
  ListRootsCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { asProcedure } from 'as-procedure';
import type { RefByUnique } from 'domain-objects';
import { HelpfulError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsOrganizationPolicyEligibility } from '@src/domain.objects/DeclaredAwsOrganizationPolicyEligibility';

/**
 * .what = checks if a policy type is enabled in the organization
 * .why = enables declarative management of policy type enablement
 * .note
 *   - uses ListRoots to check PolicyTypes array on the root
 *   - returns null if policy type is not enabled
 */
export const getOneOrganizationPolicyEligibility = asProcedure(
  async (
    input: {
      by: {
        unique: RefByUnique<typeof DeclaredAwsOrganizationPolicyEligibility>;
      };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<DeclaredAwsOrganizationPolicyEligibility | null> => {
    const client = new OrganizationsClient({
      region: context.aws.credentials.region,
    });

    try {
      // list roots to get policy types
      const response = await client.send(new ListRootsCommand({}));

      // get the first root (most orgs have exactly one)
      const root = response.Roots?.[0];
      if (!root) return null;

      // check if the requested policy type is enabled
      const policyTypeFound = root.PolicyTypes?.find(
        (pt) => pt.Type === input.by.unique.type && pt.Status === 'ENABLED',
      );

      if (!policyTypeFound) return null;

      return new DeclaredAwsOrganizationPolicyEligibility({
        type: input.by.unique.type,
        choice: 'ENABLED',
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // handle not in organization
      if (error.name === 'AWSOrganizationsNotInUseException') return null;

      throw new HelpfulError('aws.getOneOrganizationPolicyEligibility error', {
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
