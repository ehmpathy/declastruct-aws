import { IAMClient, ListAccountAliasesCommand } from '@aws-sdk/client-iam';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { HelpfulError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsAccountAlias } from '@src/domain.objects/DeclaredAwsAccountAlias';

import { asAccountAliasFromListResponse } from './asAccountAliasFromListResponse';
import { castIntoDeclaredAwsAccountAlias } from './castIntoDeclaredAwsAccountAlias';

/**
 * .what = retrieves the account alias for the current credentials
 * .why = enables lookup of the account alias for the authenticated account
 * .note
 *   - aws allows only one alias per account (singleton pattern)
 *   - auth is the only lookup method since alias IS the identifier
 *   - returns null if no alias is set
 */
export const getOneAccountAlias = asProcedure(
  async (
    input: {
      by: { auth: true };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsAccountAlias> | null> => {
    // declare the client
    const client = new IAMClient({
      region: context.aws.credentials.region,
    });

    try {
      // fetch the account aliases for the current credentials
      const response = await client.send(new ListAccountAliasesCommand({}));

      // extract alias from response (handles singleton selection)
      const alias = asAccountAliasFromListResponse({
        accountAliases: response.AccountAliases,
      });

      // return null if no alias set
      if (alias === null) return null;

      // cast to domain object and return
      return castIntoDeclaredAwsAccountAlias({ alias });
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      throw new HelpfulError('aws.getOneAccountAlias error', {
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
