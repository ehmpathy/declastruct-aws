import {
  LambdaClient,
  GetFunctionConfigurationCommand,
} from '@aws-sdk/client-lambda';
import { asProcedure } from 'as-procedure';
import { isUniqueKeyRef, Ref, RefByPrimary, RefByUnique } from 'domain-objects';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import { HasMetadata, PickOne } from 'type-fns';
import { VisualogicContext } from 'visualogic';

import { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsLambda } from '../../domain.objects/DeclaredAwsLambda';
import { castToDeclaredAwsLambda } from './castToDeclaredAwsLambda';

/**
 * .what = gets a lambda from aws
 */
export const getLambda = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsLambda>;
        unique: RefByUnique<typeof DeclaredAwsLambda>;
        ref: Ref<typeof DeclaredAwsLambda>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasMetadata<DeclaredAwsLambda> | null> => {
    // handle by ref
    if (input.by.ref)
      return isUniqueKeyRef({ of: DeclaredAwsLambda })(input.by.ref)
        ? getLambda({ by: { unique: input.by.ref } }, context)
        : getLambda({ by: { primary: input.by.ref } }, context);

    // declare the client
    const lambda = new LambdaClient({ region: context.aws.region });

    // execute the command
    const command = (() => {
      if (input.by.primary)
        return new GetFunctionConfigurationCommand({
          FunctionName: input.by.primary.arn,
        });
      if (input.by.unique)
        return new GetFunctionConfigurationCommand({
          FunctionName: input.by.unique.name,
          Qualifier: input.by.unique.qualifier ?? undefined,
        });
      throw new UnexpectedCodePathError(
        'not referenced by primary nor unique. how not?',
        { input },
      );
    })();

    try {
      const response = await lambda.send(command);
      return castToDeclaredAwsLambda(response);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      if (error.message.includes('Function not found:')) return null;
      throw new HelpfulError('aws.getLambda error', { cause: error });
    }
  },
);
