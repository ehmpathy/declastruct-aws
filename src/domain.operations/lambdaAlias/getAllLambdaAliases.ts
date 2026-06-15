import {
  GetFunctionConfigurationCommand,
  LambdaClient,
  ListAliasesCommand,
} from '@aws-sdk/client-lambda';
import { asProcedure } from 'as-procedure';
import type { HasReadonly, RefByUnique } from 'domain-objects';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsLambda } from '@src/domain.objects/DeclaredAwsLambda';
import type { DeclaredAwsLambdaAlias } from '@src/domain.objects/DeclaredAwsLambdaAlias';
import type { DeclaredAwsLambdaVersion } from '@src/domain.objects/DeclaredAwsLambdaVersion';
import { getOneLambda } from '@src/domain.operations/lambda/getOneLambda';
import { asHashFromBase64 } from '@src/domain.operations/lambda/utils/asHashFromBase64';
import { parseRoleArnIntoRef } from '@src/domain.operations/lambda/utils/parseRoleArnIntoRef';
import { calcAwsLambdaConfigHash } from '@src/domain.operations/lambdaVersion/utils/calcAwsLambdaConfigHash';

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

      // compute config hash from version config
      const configHash = calcAwsLambdaConfigHash({
        of: {
          handler: versionConfig.Handler!,
          runtime: versionConfig.Runtime!,
          memory: versionConfig.MemorySize!,
          timeout: versionConfig.Timeout!,
          role: parseRoleArnIntoRef(versionConfig.Role!),
          envars: versionConfig.Environment?.Variables ?? {},
        },
      });

      // build version ref with real hash values
      const versionRef: RefByUnique<typeof DeclaredAwsLambdaVersion> = {
        lambda: lambdaRef,
        hash: {
          code: asHashFromBase64(versionConfig.CodeSha256 ?? ''),
          config: configHash,
        },
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
