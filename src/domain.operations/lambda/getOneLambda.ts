import { GetFunctionCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { asProcedure } from 'as-procedure';
import {
  type HasReadonly,
  isRefByPrimary,
  isRefByUnique,
  type Ref,
  type RefByPrimary,
  type RefByUnique,
} from 'domain-objects';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsLambda } from '../../domain.objects/DeclaredAwsLambda';
import { castIntoDeclaredAwsLambda } from './castIntoDeclaredAwsLambda';

/**
 * .what = gets a single lambda from aws
 * .why = enables lookup by primary (arn) or unique (name)
 */
export const getOneLambda = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsLambda>;
        unique: RefByUnique<typeof DeclaredAwsLambda>;
        ref: Ref<typeof DeclaredAwsLambda>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsLambda> | null> => {
    // handle by ref using type guards
    if (input.by.ref) {
      if (isRefByUnique({ of: DeclaredAwsLambda })(input.by.ref))
        return getOneLambda({ by: { unique: input.by.ref } }, context);
      if (isRefByPrimary({ of: DeclaredAwsLambda })(input.by.ref))
        return getOneLambda({ by: { primary: input.by.ref } }, context);
      UnexpectedCodePathError.throw('ref is neither unique nor primary', {
        input,
      });
    }

    // declare the client
    const lambda = new LambdaClient({ region: context.aws.credentials.region });

    // execute the command
    const command = (() => {
      if (input.by.primary)
        return new GetFunctionCommand({
          FunctionName: input.by.primary.arn,
        });
      if (input.by.unique)
        return new GetFunctionCommand({
          FunctionName: input.by.unique.name,
        });
      throw new UnexpectedCodePathError(
        'not referenced by primary nor unique. how not?',
        { input },
      );
    })();

    try {
      const response = await lambda.send(command);
      return castIntoDeclaredAwsLambda({
        ...response.Configuration,
        tags: response.Tags,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // handle function not found (various ways AWS SDK reports this)
      if (error.name === 'ResourceNotFoundException') return null;
      if (error.message.includes('Function not found')) return null;
      const metadata = (error as { $metadata?: { httpStatusCode?: number } })
        .$metadata;
      if (metadata?.httpStatusCode === 404) return null;

      throw new HelpfulError('aws.getOneLambda error', {
        cause: error,
        context: {
          errorName: error.name,
          errorMessage: error.message,
          httpStatusCode: metadata?.httpStatusCode,
          input,
        },
      });
    }
  },
);
