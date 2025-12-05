import { LambdaClient, PublishVersionCommand } from '@aws-sdk/client-lambda';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import type { DeclaredAwsLambdaVersion } from '../../domain.objects/DeclaredAwsLambdaVersion';
import { getOneLambda } from '../lambda/getOneLambda';
import { parseRoleArnIntoRef } from '../lambda/utils/parseRoleArnIntoRef';
import { castIntoDeclaredAwsLambdaVersion } from './castIntoDeclaredAwsLambdaVersion';
import { getOneLambdaVersion } from './getOneLambdaVersion';
import { calcConfigSha256 } from './utils/calcConfigSha256';

/**
 * .what = publishes a new lambda version
 * .why = creates immutable snapshot for alias targeting
 *
 * .note
 *   - PublishVersion is idempotent — returns existing if code+config unchanged
 *   - we verify by fingerprint before and after to ensure correctness
 */
export const setLambdaVersion = asProcedure(
  async (
    input: PickOne<{
      finsert: DeclaredAwsLambdaVersion;
      upsert: DeclaredAwsLambdaVersion;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsLambdaVersion>> => {
    const versionDesired = input.finsert ?? input.upsert;

    // check if version already exists by fingerprint
    const before = await getOneLambdaVersion(
      {
        by: {
          unique: {
            lambda: versionDesired.lambda,
            codeSha256: versionDesired.codeSha256,
            configSha256: versionDesired.configSha256,
          },
        },
      },
      context,
    );

    // if exists, return before (both finsert and upsert are no-op for immutable versions)
    if (before) return before;

    // resolve lambda ref to get function name
    const lambda = await getOneLambda(
      { by: { ref: versionDesired.lambda } },
      context,
    );

    // failfast if lambda doesn't exist
    if (!lambda)
      UnexpectedCodePathError.throw('lambda not found for version publish', {
        lambda: versionDesired.lambda,
      });

    // create lambda client
    const lambdaClient = new LambdaClient({
      region: context.aws.credentials.region,
    });

    // publish version
    const result = await lambdaClient.send(
      new PublishVersionCommand({
        FunctionName: lambda.name,
        CodeSha256: versionDesired.codeSha256,
        Description: versionDesired.description ?? undefined,
      }),
    );

    // verify published version matches expected fingerprint
    const publishedConfigSha256 = calcConfigSha256({
      of: {
        handler: result.Handler!,
        runtime: result.Runtime!,
        memory: result.MemorySize!,
        timeout: result.Timeout!,
        role: parseRoleArnIntoRef(result.Role!),
        envars: result.Environment?.Variables ?? {},
      },
    });
    if (publishedConfigSha256 !== versionDesired.configSha256) {
      UnexpectedCodePathError.throw('config hash mismatch after publish', {
        expected: versionDesired.configSha256,
        actual: publishedConfigSha256,
      });
    }

    // cast and return
    return castIntoDeclaredAwsLambdaVersion({
      functionConfig: result,
      lambda: versionDesired.lambda,
    });
  },
);
