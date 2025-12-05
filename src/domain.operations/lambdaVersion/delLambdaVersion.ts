import { DeleteFunctionCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { asProcedure } from 'as-procedure';
import {
  isRefByPrimary,
  isRefByUnique,
  type Ref,
  type RefByPrimary,
  type RefByUnique,
} from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsLambdaVersion } from '../../domain.objects/DeclaredAwsLambdaVersion';
import { getOneLambdaVersion } from './getOneLambdaVersion';

/**
 * .what = deletes a lambda version
 * .why = enables cleanup of old versions to free storage quota (75GB regional limit)
 *
 * .note
 *   - cannot delete $LATEST
 *   - cannot delete versions referenced by aliases (must delete alias first)
 *   - idempotent: returns success if version already deleted
 */
export const delLambdaVersion = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsLambdaVersion>;
        unique: RefByUnique<typeof DeclaredAwsLambdaVersion>;
        ref: Ref<typeof DeclaredAwsLambdaVersion>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<{ deleted: true }> => {
    // resolve version ref to consistent by structure
    const by = (() => {
      if (input.by.primary) return { primary: input.by.primary };
      if (input.by.unique) return { unique: input.by.unique };
      if (input.by.ref) {
        if (isRefByUnique({ of: DeclaredAwsLambdaVersion })(input.by.ref))
          return { unique: input.by.ref };
        if (isRefByPrimary({ of: DeclaredAwsLambdaVersion })(input.by.ref))
          return { primary: input.by.ref };
      }
      return UnexpectedCodePathError.throw(
        'version ref is neither unique nor primary',
        { input },
      );
    })();

    // get the version
    const foundBefore = await getOneLambdaVersion({ by }, context);

    // if already gone, return success (idempotent)
    if (!foundBefore) return { deleted: true };

    // guard against deleting $LATEST
    if (!foundBefore.version || foundBefore.version === '$LATEST')
      return BadRequestError.throw('cannot delete $LATEST version', {
        foundBefore,
      });

    // create lambda client
    const lambdaClient = new LambdaClient({
      region: context.aws.credentials.region,
    });

    // delete version
    await lambdaClient
      .send(
        new DeleteFunctionCommand({
          FunctionName: foundBefore.lambda.name,
          Qualifier: foundBefore.version,
        }),
      )
      .catch((error) => {
        // ignore if already deleted (idempotent)
        if (
          error instanceof Error &&
          error.message.includes('Function not found:')
        )
          return;
        throw error;
      });

    return { deleted: true };
  },
);
