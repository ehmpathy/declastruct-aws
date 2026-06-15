import { LambdaClient, PublishVersionCommand } from '@aws-sdk/client-lambda';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsLambdaVersion } from '@src/domain.objects/DeclaredAwsLambdaVersion';
import { getOneLambda } from '@src/domain.operations/lambda/getOneLambda';
import { asBase64FromHash } from '@src/domain.operations/lambda/utils/asBase64FromHash';
import { parseRoleArnIntoRef } from '@src/domain.operations/lambda/utils/parseRoleArnIntoRef';

import { castIntoDeclaredAwsLambdaVersion } from './castIntoDeclaredAwsLambdaVersion';
import { getOneLambdaVersion } from './getOneLambdaVersion';
import { calcAwsLambdaConfigHash } from './utils/calcAwsLambdaConfigHash';

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
      findsert: DeclaredAwsLambdaVersion;
      upsert: DeclaredAwsLambdaVersion;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsLambdaVersion>> => {
    const versionDesired = input.findsert ?? input.upsert;

    // check if version already exists by fingerprint
    const before = await getOneLambdaVersion(
      {
        by: {
          unique: {
            lambda: versionDesired.lambda,
            hash: versionDesired.hash,
          },
        },
      },
      context,
    );

    // if exists, return before (both findsert and upsert are no-op for immutable versions)
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

    // publish version (AWS expects base64 for CodeSha256)
    const result = await lambdaClient.send(
      new PublishVersionCommand({
        FunctionName: lambda.name,
        CodeSha256: asBase64FromHash(versionDesired.hash.code),
        Description: versionDesired.description ?? undefined,
      }),
    );

    // verify published version matches expected fingerprint
    const publishedConfigHash = calcAwsLambdaConfigHash({
      of: {
        handler: result.Handler!,
        runtime: result.Runtime!,
        memory: result.MemorySize!,
        timeout: result.Timeout!,
        role: parseRoleArnIntoRef(result.Role!),
        envars: result.Environment?.Variables ?? {},
      },
    });
    if (publishedConfigHash !== versionDesired.hash.config) {
      UnexpectedCodePathError.throw('config hash mismatch after publish', {
        expected: versionDesired.hash.config,
        actual: publishedConfigHash,
      });
    }

    // cast and return
    return castIntoDeclaredAwsLambdaVersion({
      functionConfig: result,
      lambda: versionDesired.lambda,
    });
  },
);
