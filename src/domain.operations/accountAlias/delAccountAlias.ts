import { DeleteAccountAliasCommand, IAMClient } from '@aws-sdk/client-iam';
import { asProcedure } from 'as-procedure';
import { HelpfulError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getOneAccountAlias } from './getOneAccountAlias';

/**
 * .what = deletes the account alias for the current credentials
 * .why = enables removal of the account alias
 * .note
 *   - idempotent: returns success if alias already absent
 *   - only supports auth lookup since alias is account-scoped singleton
 */
export const delAccountAlias = asProcedure(
  async (
    input: {
      by: { auth: true };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<{ deleted: true }> => {
    // get the current alias
    const foundBefore = await getOneAccountAlias(input, context);

    // if not found, return success (idempotent)
    if (!foundBefore) return { deleted: true };

    // declare the client
    const client = new IAMClient({
      region: context.aws.credentials.region,
    });

    try {
      // delete the alias
      await client.send(
        new DeleteAccountAliasCommand({
          AccountAlias: foundBefore.alias,
        }),
      );
      return { deleted: true };
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // idempotent: alias already deleted (race condition)
      if (error.name === 'NoSuchEntityException') return { deleted: true };

      throw new HelpfulError('aws.delAccountAlias error', {
        cause: error,
        context: {
          errorName: error.name,
          errorMessage: error.message,
          input,
          alias: foundBefore.alias,
        },
      });
    }
  },
);
