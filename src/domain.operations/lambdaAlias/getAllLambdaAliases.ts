import {
  GetFunctionConfigurationCommand,
  LambdaClient,
  ListAliasesCommand,
} from '@aws-sdk/client-lambda';
import { asProcedure } from 'as-procedure';
import { HasReadonly, RefByUnique } from 'domain-objects';
import { VisualogicContext } from 'visualogic';

import { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsLambda } from '../../domain.objects/DeclaredAwsLambda';
import { DeclaredAwsLambdaAlias } from '../../domain.objects/DeclaredAwsLambdaAlias';
import { DeclaredAwsLambdaVersion } from '../../domain.objects/DeclaredAwsLambdaVersion';
import { getOneLambda } from '../lambda/getOneLambda';
import { parseRoleArnIntoRef } from '../lambda/utils/parseRoleArnIntoRef';
import { calcConfigSha256 } from '../lambdaVersion/utils/calcConfigSha256';
import { castIntoDeclaredAwsLambdaAlias } from './castIntoDeclaredAwsLambdaAlias';

/**
 * .what = retrieves all aliases for a lambda function
 * .why = enables listing aliases for cleanup or inspection
 */
export const getAllLambdaAliases = asProcedure(
  async (
    input: {
      by: { lambda: RefByUnique<typeof DeclaredAwsLambda> };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsLambdaAlias>[]> => {
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

    // list all aliases for this function
    const aliasList: {
      Name?: string;
      AliasArn?: string;
      FunctionVersion?: string;
      Description?: string;
      RoutingConfig?: { AdditionalVersionWeights?: Record<string, number> };
    }[] = [];
    let nextMarker: string | undefined;

    do {
      const response = await lambdaClient.send(
        new ListAliasesCommand({
          FunctionName: lambda.name,
          Marker: nextMarker,
        }),
      );
      aliasList.push(...(response.Aliases ?? []));
      nextMarker = response.NextMarker;
    } while (nextMarker);

    // build lambda ref for domain objects
    const lambdaRef: RefByUnique<typeof DeclaredAwsLambda> = input.by.lambda;

    // convert to domain objects with real sha256 lookups
    const results: HasReadonly<typeof DeclaredAwsLambdaAlias>[] = [];
    for (const alias of aliasList) {
      // lookup the actual version config to get real sha256 values
      const versionConfig = await lambdaClient.send(
        new GetFunctionConfigurationCommand({
          FunctionName: lambda.name,
          Qualifier: alias.FunctionVersion,
        }),
      );

      // compute configSha256 from version config
      const configSha256 = calcConfigSha256({
        of: {
          handler: versionConfig.Handler!,
          runtime: versionConfig.Runtime!,
          memory: versionConfig.MemorySize!,
          timeout: versionConfig.Timeout!,
          role: parseRoleArnIntoRef(versionConfig.Role!),
          envars: versionConfig.Environment?.Variables ?? {},
        },
      });

      // build version ref with real sha256 values
      const versionRef: RefByUnique<typeof DeclaredAwsLambdaVersion> = {
        lambda: lambdaRef,
        codeSha256: versionConfig.CodeSha256 ?? '',
        configSha256,
      };

      results.push(
        castIntoDeclaredAwsLambdaAlias({
          aliasConfig: alias,
          lambda: lambdaRef,
          version: versionRef,
        }),
      );
    }

    return results;
  },
);
