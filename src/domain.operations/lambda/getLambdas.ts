import { LambdaClient, ListFunctionsCommand } from '@aws-sdk/client-lambda';
import { HelpfulError } from 'helpful-errors';
import { HasMetadata } from 'type-fns';
import { VisualogicContext } from 'visualogic';

import { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsLambda } from '../../domain.objects/DeclaredAwsLambda';
import { castToDeclaredAwsLambda } from './castToDeclaredAwsLambda';

/**
 * .what = lists lambdas from aws
 */
export const getLambdas = async (
  input: {
    page?: {
      range?: { until: { marker: string } };
      limit?: number;
    };
  },
  context: ContextAwsApi & VisualogicContext,
): Promise<HasMetadata<DeclaredAwsLambda>[]> => {
  const lambda = new LambdaClient({ region: context.aws.region });

  const command = new ListFunctionsCommand({
    Marker: input.page?.range?.until.marker,
    MaxItems: input.page?.limit,
  });

  try {
    const response = await lambda.send(command);
    const functions = response.Functions ?? [];
    return functions.map(castToDeclaredAwsLambda);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    throw new HelpfulError('aws.getLambdas error', { cause: error });
  }
};
