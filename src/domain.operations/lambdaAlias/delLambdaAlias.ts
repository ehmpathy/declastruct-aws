import { DeleteAliasCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { asProcedure } from 'as-procedure';
import {
  isRefByPrimary,
  isRefByUnique,
  type Ref,
  type RefByPrimary,
  type RefByUnique,
} from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsLambdaAlias } from '../../domain.objects/DeclaredAwsLambdaAlias';
import { getOneLambdaAlias } from './getOneLambdaAlias';

/**
 * .what = deletes a lambda alias
 * .why = enables cleanup of old aliases (e.g., stale pr-X aliases after merge)
 *
 * .note
 *   - idempotent: returns success if alias already deleted
 *   - deleting alias does not delete the version it points to
 */
export const delLambdaAlias = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsLambdaAlias>;
        unique: RefByUnique<typeof DeclaredAwsLambdaAlias>;
        ref: Ref<typeof DeclaredAwsLambdaAlias>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<{ deleted: true }> => {
    // resolve alias ref to consistent by structure
    const by = (() => {
      if (input.by.primary) return { primary: input.by.primary };
      if (input.by.unique) return { unique: input.by.unique };
      if (input.by.ref) {
        if (isRefByUnique({ of: DeclaredAwsLambdaAlias })(input.by.ref))
          return { unique: input.by.ref };
        if (isRefByPrimary({ of: DeclaredAwsLambdaAlias })(input.by.ref))
          return { primary: input.by.ref };
      }
      return UnexpectedCodePathError.throw(
        'alias ref is neither unique nor primary',
        { input },
      );
    })();

    // get the alias
    const foundBefore = await getOneLambdaAlias({ by }, context);

    // if already gone, return success (idempotent)
    if (!foundBefore) return { deleted: true };

    // create lambda client
    const lambdaClient = new LambdaClient({
      region: context.aws.credentials.region,
    });

    // delete alias
    await lambdaClient
      .send(
        new DeleteAliasCommand({
          FunctionName: foundBefore.lambda.name,
          Name: foundBefore.name,
        }),
      )
      .catch((error) => {
        // ignore if already deleted (idempotent)
        if (
          error instanceof Error &&
          error.name === 'ResourceNotFoundException'
        )
          return;
        throw error;
      });

    return { deleted: true };
  },
);
