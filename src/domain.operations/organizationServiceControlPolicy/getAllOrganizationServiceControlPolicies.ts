import {
  ListPoliciesCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { HelpfulError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsOrganizationServiceControlPolicy } from '@src/domain.objects/DeclaredAwsOrganizationServiceControlPolicy';

import { getOneOrganizationServiceControlPolicy } from './getOneOrganizationServiceControlPolicy';

/**
 * .what = retrieves all SCPs in the organization
 * .why = enables list and sync of policies
 * .note
 *   - paginates through all policies
 *   - enriches each with full content and tags via getOne
 */
export const getAllOrganizationServiceControlPolicies = asProcedure(
  async (
    _input: Record<string, never>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<
    HasReadonly<typeof DeclaredAwsOrganizationServiceControlPolicy>[]
  > => {
    // declare the client
    const client = new OrganizationsClient({
      region: context.aws.credentials.region,
    });

    try {
      const policies: HasReadonly<
        typeof DeclaredAwsOrganizationServiceControlPolicy
      >[] = [];
      let nextToken: string | undefined;

      // paginate through all SCPs
      do {
        const response = await client.send(
          new ListPoliciesCommand({
            Filter: 'SERVICE_CONTROL_POLICY',
            NextToken: nextToken,
          }),
        );

        // enrich each policy with full content and tags
        for (const policySummary of response.Policies ?? []) {
          if (!policySummary.Id) continue;

          const policy = await getOneOrganizationServiceControlPolicy(
            { by: { primary: { id: policySummary.Id } } },
            context,
          );
          if (policy) policies.push(policy);
        }

        nextToken = response.NextToken;
      } while (nextToken);

      return policies;
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      throw new HelpfulError(
        'aws.getAllOrganizationServiceControlPolicies error',
        {
          cause: error,
          context: {
            errorName: error.name,
            errorMessage: error.message,
          },
        },
      );
    }
  },
);
