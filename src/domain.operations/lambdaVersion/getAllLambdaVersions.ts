import {
  GetFunctionConfigurationCommand,
  LambdaClient,
  ListVersionsByFunctionCommand,
} from '@aws-sdk/client-lambda';
import { asProcedure } from 'as-procedure';
import { HasReadonly, RefByUnique } from 'domain-objects';
import { VisualogicContext } from 'visualogic';

import { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsLambda } from '../../domain.objects/DeclaredAwsLambda';
import { DeclaredAwsLambdaVersion } from '../../domain.objects/DeclaredAwsLambdaVersion';
import { getOneLambda } from '../lambda/getOneLambda';
import { castIntoDeclaredAwsLambdaVersion } from './castIntoDeclaredAwsLambdaVersion';

/**
 * .what = retrieves all versions for a lambda function
 * .why = enables listing versions for cleanup or inspection
 */
export const getAllLambdaVersions = asProcedure(
  async (
    input: {
      by: { lambda: RefByUnique<typeof DeclaredAwsLambda> };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsLambdaVersion>[]> => {
    // resolve lambda ref to get function name
    const lambda = await getOneLambda(
      { by: { ref: input.by.lambda } },
      context,
    );
    if (!lambda) return [];

    // create lambda client
    const lambdaClient = new LambdaClient({
      region: context.aws.credentials.region,
    });

    // build lambda ref for domain objects
    const lambdaRef: RefByUnique<typeof DeclaredAwsLambda> = input.by.lambda;

    // list all versions for this function
    const versionList: {
      Version?: string;
      CodeSha256?: string;
      FunctionArn?: string;
    }[] = [];
    let nextMarker: string | undefined;

    do {
      const response = await lambdaClient.send(
        new ListVersionsByFunctionCommand({
          FunctionName: lambda.name,
          Marker: nextMarker,
        }),
      );
      versionList.push(...(response.Versions ?? []));
      nextMarker = response.NextMarker;
    } while (nextMarker);

    // convert to domain objects, excluding $LATEST
    const versions: HasReadonly<typeof DeclaredAwsLambdaVersion>[] = [];

    for (const ver of versionList) {
      // skip $LATEST
      if (ver.Version === '$LATEST') continue;

      // get full config to compute configSha256
      const versionConfig = await lambdaClient.send(
        new GetFunctionConfigurationCommand({
          FunctionName: lambda.name,
          Qualifier: ver.Version,
        }),
      );

      // cast version config into domain object
      versions.push(
        castIntoDeclaredAwsLambdaVersion({
          functionConfig: versionConfig,
          lambda: lambdaRef,
        }),
      );
    }

    return versions;
  },
);
