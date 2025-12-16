import { LambdaClient, ListFunctionsCommand } from '@aws-sdk/client-lambda';
import { HelpfulError } from 'helpful-errors';
import type { HasMetadata } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsLambda } from '@src/domain.objects/DeclaredAwsLambda';

import { castIntoDeclaredAwsLambda } from './castIntoDeclaredAwsLambda';

/**
 * .what = lists all lambdas from aws
 * .why = enables bulk retrieval of lambda configurations
 */
export const getAllLambdas = async (
  input: {
    page?: {
      range?: { until: { marker: string } };
      limit?: number;
    };
  },
  context: ContextAwsApi & VisualogicContext,
): Promise<HasMetadata<DeclaredAwsLambda>[]> => {
  const lambda = new LambdaClient({ region: context.aws.credentials.region });

  const command = new ListFunctionsCommand({
    Marker: input.page?.range?.until.marker,
    MaxItems: input.page?.limit,
  });

  try {
    const response = await lambda.send(command);
    const functions = response.Functions ?? [];
    return functions.map(castIntoDeclaredAwsLambda);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    throw new HelpfulError('aws.getAllLambdas error', { cause: error });
  }
};
