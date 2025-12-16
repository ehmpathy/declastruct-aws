import {
  GetAliasCommand,
  GetFunctionConfigurationCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';
import { asProcedure } from 'as-procedure';
import {
  type HasReadonly,
  isRefByPrimary,
  isRefByUnique,
  type Ref,
  type RefByPrimary,
  type RefByUnique,
} from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsLambda } from '@src/domain.objects/DeclaredAwsLambda';
import { DeclaredAwsLambdaAlias } from '@src/domain.objects/DeclaredAwsLambdaAlias';
import type { DeclaredAwsLambdaVersion } from '@src/domain.objects/DeclaredAwsLambdaVersion';
import { parseRoleArnIntoRef } from '@src/domain.operations/lambda/utils/parseRoleArnIntoRef';
import { calcConfigSha256 } from '@src/domain.operations/lambdaVersion/utils/calcConfigSha256';

import { castIntoDeclaredAwsLambdaAlias } from './castIntoDeclaredAwsLambdaAlias';

/**
 * .what = retrieves a lambda alias by primary (arn) or unique (lambda + name)
 * .why = enables lookup for alias management
 */
export const getOneLambdaAlias = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsLambdaAlias>;
        unique: RefByUnique<typeof DeclaredAwsLambdaAlias>;
        ref: Ref<typeof DeclaredAwsLambdaAlias>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsLambdaAlias> | null> => {
    // resolve ref to primary or unique
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
        'ref is neither unique nor primary',
        { input },
      );
    })();

    // determine function name and alias name
    const names: { functionName: string; aliasName: string } | null = (() => {
      // if by primary (arn), parse from arn
      if (by.primary) {
        const arnParts = by.primary.arn.split(':');
        const aliasNameFromArn = arnParts[arnParts.length - 1];
        const functionNameFromArn = arnParts[arnParts.length - 2];
        if (!functionNameFromArn || !aliasNameFromArn) return null;
        return {
          functionName: functionNameFromArn,
          aliasName: aliasNameFromArn,
        };
      }

      // if by unique, extract directly from the ref
      if (by.unique)
        return {
          functionName: by.unique.lambda.name,
          aliasName: by.unique.name,
        };

      return UnexpectedCodePathError.throw(
        'not referenced by primary nor unique',
        { input },
      );
    })();

    // if we couldn't parse names, return null
    if (!names) return null;

    // create lambda client
    const lambdaClient = new LambdaClient({
      region: context.aws.credentials.region,
    });

    // get alias from aws
    const response = await lambdaClient
      .send(
        new GetAliasCommand({
          FunctionName: names.functionName,
          Name: names.aliasName,
        }),
      )
      .catch((error) => {
        if (
          error instanceof Error &&
          error.name === 'ResourceNotFoundException'
        )
          return null;
        throw error;
      });

    // if not found, return null
    if (!response) return null;

    // build lambda ref
    const lambdaRef: RefByUnique<typeof DeclaredAwsLambda> = by.unique
      ?.lambda ?? { name: names.functionName };

    // lookup the actual version config to get real sha256 values
    const versionConfig = await lambdaClient.send(
      new GetFunctionConfigurationCommand({
        FunctionName: names.functionName,
        Qualifier: response.FunctionVersion,
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

    return castIntoDeclaredAwsLambdaAlias({
      aliasConfig: response,
      lambda: lambdaRef,
      version: versionRef,
    });
  },
);
