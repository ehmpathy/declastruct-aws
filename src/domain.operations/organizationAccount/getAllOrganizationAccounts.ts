import { ListAccountsCommand } from '@aws-sdk/client-organizations';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { HelpfulError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import { getAwsOrganizationsClient } from '../../access/sdks/getAwsOrganizationsClient';
import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import type { DeclaredAwsOrganizationAccount } from '../../domain.objects/DeclaredAwsOrganizationAccount';
import { castIntoDeclaredAwsOrganizationAccount } from './castIntoDeclaredAwsOrganizationAccount';
import { getOneOrganizationAccountTags } from './getOneOrganizationAccountTags';

/**
 * .what = lists all accounts in the organization
 * .why = enables fetching all member accounts for the authed organization
 * .note
 *   - handles pagination automatically
 *   - fails fast if not authed as org manager (required for account operations)
 */
export const getAllOrganizationAccounts = asProcedure(
  async (
    input: {
      by: { auth: true };
      page?: {
        limit?: number;
        nextToken?: string;
      };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<{
    accounts: HasReadonly<typeof DeclaredAwsOrganizationAccount>[];
    nextToken?: string;
  }> => {
    // get org client (fail-fast on non-org-manager auth)
    const { client, organization } = await getAwsOrganizationsClient(context);

    try {
      const response = await client.send(
        new ListAccountsCommand({
          MaxResults: input.page?.limit ?? 20,
          NextToken: input.page?.nextToken,
        }),
      );

      // fetch tags for each account and cast
      const accounts = await Promise.all(
        (response.Accounts ?? []).map(async (account) => {
          const tags = await getOneOrganizationAccountTags(
            { by: { primary: { id: account.Id! } } },
            { client },
          );
          return castIntoDeclaredAwsOrganizationAccount({
            account,
            organization: { id: organization.id },
            tags,
          });
        }),
      );

      return {
        accounts,
        nextToken: response.NextToken,
      };
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      throw new HelpfulError('aws.getAllOrganizationAccounts error', {
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
