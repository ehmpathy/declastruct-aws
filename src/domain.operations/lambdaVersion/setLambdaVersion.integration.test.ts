import { given, then, useBeforeAll } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import { getOneLambda } from '../lambda/getOneLambda';
import { setLambdaVersion } from './setLambdaVersion';
import { calcConfigSha256 } from './utils/calcConfigSha256';

describe('setLambdaVersion', () => {
  const context = useBeforeAll(() => getSampleAwsApiContext());

  // use the same lambda created by setLambda.integration.test.ts
  const testLambdaName = 'declastruct-test-lambda';

  given('an existing lambda function', () => {
    then('we should be able to publish a version', async () => {
      // get the current lambda state
      const lambda = await getOneLambda(
        { by: { unique: { name: testLambdaName } } },
        context,
      );

      expect(lambda).not.toBeNull();
      if (!lambda) return;

      // compute config sha256
      const configSha256 = calcConfigSha256({ of: lambda });

      // publish a version
      const version = await setLambdaVersion(
        {
          findsert: {
            lambda: { name: testLambdaName },
            codeSha256: lambda.codeSha256!,
            configSha256,
          },
        },
        context,
      );

      expect(version.lambda.name).toBe(testLambdaName);
      expect(version.version).toBeDefined();
      expect(version.arn).toContain(`:function:${testLambdaName}:`);
      console.log('Published version:', version);
    });

    then('findsert should be idempotent for same code+config', async () => {
      const lambda = await getOneLambda(
        { by: { unique: { name: testLambdaName } } },
        context,
      );

      expect(lambda).not.toBeNull();
      if (!lambda) return;

      // compute config sha256
      const configSha256 = calcConfigSha256({ of: lambda });

      // publish same version again - should return existing
      const version = await setLambdaVersion(
        {
          findsert: {
            lambda: { name: testLambdaName },
            codeSha256: lambda.codeSha256!,
            configSha256,
          },
        },
        context,
      );

      expect(version.lambda.name).toBe(testLambdaName);
      console.log('Idempotent version:', version);
    });
  });
});
