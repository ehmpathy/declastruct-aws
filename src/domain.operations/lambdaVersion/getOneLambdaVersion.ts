import {
  GetFunctionConfigurationCommand,
  LambdaClient,
  ListVersionsByFunctionCommand,
} from '@aws-sdk/client-lambda';
import { asProcedure } from 'as-procedure';
import {
  HasReadonly,
  isRefByPrimary,
  isRefByUnique,
  Ref,
  RefByPrimary,
  RefByUnique,
} from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { PickOne } from 'type-fns';
import { VisualogicContext } from 'visualogic';

import { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsLambda } from '../../domain.objects/DeclaredAwsLambda';
import { DeclaredAwsLambdaVersion } from '../../domain.objects/DeclaredAwsLambdaVersion';
import { getOneLambda } from '../lambda/getOneLambda';
import { parseRoleArnIntoRef } from '../lambda/utils/parseRoleArnIntoRef';
import { castIntoDeclaredAwsLambdaVersion } from './castIntoDeclaredAwsLambdaVersion';
import { calcConfigSha256 } from './utils/calcConfigSha256';

// still needed for unique key comparison

/**
 * .what = retrieves a lambda version by primary (arn) or unique (lambda + hashes)
 * .why = enables lookup by content fingerprint for idempotent publishing
 */
export const getOneLambdaVersion = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsLambdaVersion>;
        unique: RefByUnique<typeof DeclaredAwsLambdaVersion>;
        ref: Ref<typeof DeclaredAwsLambdaVersion>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsLambdaVersion> | null> => {
    // resolve ref to primary or unique
    const by = await (async () => {
      // passthrough if not ref
      if (!input.by.ref) return input.by;

      // route to unique if ref is by unique
      if (isRefByUnique({ of: DeclaredAwsLambdaVersion })(input.by.ref))
        return { unique: input.by.ref };

      // route to primary if ref is by primary
      if (isRefByPrimary({ of: DeclaredAwsLambdaVersion })(input.by.ref))
        return { primary: input.by.ref };

      // failfast if ref is neither unique nor primary
      return UnexpectedCodePathError.throw(
        'ref is neither unique nor primary',
        {
          input,
        },
      );
    })();

    // create lambda client
    const lambdaClient = new LambdaClient({
      region: context.aws.credentials.region,
    });

    // if by primary (arn), lookup directly
    if (by.primary) {
      try {
        const response = await lambdaClient.send(
          new GetFunctionConfigurationCommand({
            FunctionName: by.primary.arn,
          }),
        );

        // failfast if this is $LATEST (not a published version)
        if (response.Version === '$LATEST') return null;

        // build lambda ref for casting
        const lambdaRef: RefByUnique<typeof DeclaredAwsLambda> = {
          name: response.FunctionName!,
        };

        return castIntoDeclaredAwsLambdaVersion({
          functionConfig: response,
          lambda: lambdaRef,
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('Function not found:')
        )
          return null;
        throw error;
      }
    }

    // if by unique (lambda + hashes), search versions
    if (by.unique) {
      // resolve lambda ref to get function name
      const lambda = await getOneLambda(
        { by: { ref: by.unique.lambda } },
        context,
      );
      if (!lambda) return null;

      // list all versions for this function
      const versions: {
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
        versions.push(...(response.Versions ?? []));
        nextMarker = response.NextMarker;
      } while (nextMarker);

      // find version matching codeSha256 and configSha256
      for (const ver of versions) {
        // skip $LATEST
        if (ver.Version === '$LATEST') continue;

        // check codeSha256 match
        if (ver.CodeSha256 !== by.unique.codeSha256) continue;

        // get full config to compute configSha256
        const versionConfig = await lambdaClient.send(
          new GetFunctionConfigurationCommand({
            FunctionName: lambda.name,
            Qualifier: ver.Version,
          }),
        );

        // compute config hash to check for match
        const configHash = calcConfigSha256({
          of: {
            handler: versionConfig.Handler!,
            runtime: versionConfig.Runtime!,
            memory: versionConfig.MemorySize!,
            timeout: versionConfig.Timeout!,
            role: parseRoleArnIntoRef(versionConfig.Role!),
            envars: versionConfig.Environment?.Variables ?? {},
          },
        });

        // check configSha256 match
        if (configHash !== by.unique.configSha256) continue;

        // found matching version
        return castIntoDeclaredAwsLambdaVersion({
          functionConfig: versionConfig,
          lambda: by.unique.lambda,
        });
      }

      // no matching version found
      return null;
    }

    // failfast if neither primary nor unique
    return UnexpectedCodePathError.throw(
      'not referenced by primary nor unique',
      { input },
    );
  },
);
