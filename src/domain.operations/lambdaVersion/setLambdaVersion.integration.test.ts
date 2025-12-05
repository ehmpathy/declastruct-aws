import { given, then } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import type { DeclaredAwsLambda } from '../../domain.objects/DeclaredAwsLambda';
import { getOneLambda } from '../lambda/getOneLambda';
import { setLambda } from '../lambda/setLambda';
import { setLambdaVersion } from './setLambdaVersion';
import { calcConfigSha256 } from './utils/calcConfigSha256';

describe('setLambdaVersion', () => {
  const context = getSampleAwsApiContext();

  const testLambdaName = 'declastruct-test-lambda';

  // note: this test requires the declastruct-test-role to exist with lambda assume role trust
  // and lambda.sample.zip to contain valid lambda code
  const lambdaDesired: DeclaredAwsLambda = {
    name: testLambdaName,

    runtime: 'nodejs18.x',
    role: { name: 'declastruct-test-role' }, // created by iamRole integration test
    handler: 'index.handler',
    timeout: 30,
    memory: 128,
    envars: { NODE_ENV: 'test' },
    codeZipUri: './src/.test/lambda.sample.zip',
  };

  given('a lambda function', () => {
    then.skip('we should be able to create the lambda first', async () => {
      // ensure lambda exists
      const lambda = await setLambda({ upsert: lambdaDesired }, context);
      expect(lambda.name).toBe(testLambdaName);
      console.log('Lambda created:', lambda);
    });

    then.skip('we should be able to publish a version', async () => {
      // get the current lambda state
      const lambda = await getOneLambda(
        { by: { unique: { name: testLambdaName } } },
        context,
      );

      if (!lambda) {
        console.log('Lambda not found - run the create test first');
        return;
      }

      // compute config sha256
      const configSha256 = calcConfigSha256({ of: lambda });

      // publish a version
      const version = await setLambdaVersion(
        {
          finsert: {
            lambda: { name: testLambdaName },
            codeSha256: lambda.codeSha256!,
            configSha256,
          },
        },
        context,
      );

      expect(version.lambda.name).toBe(testLambdaName);
      expect(version.version).toBeDefined();
      expect(version.arn).toContain(`:${version.version}`);
      console.log('Published version:', version);
    });

    then.skip('finsert should be idempotent for same code+config', async () => {
      const lambda = await getOneLambda(
        { by: { unique: { name: testLambdaName } } },
        context,
      );

      if (!lambda) {
        console.log('Lambda not found - run the create test first');
        return;
      }

      // compute config sha256
      const configSha256 = calcConfigSha256({ of: lambda });

      // publish same version again - should return existing
      const version = await setLambdaVersion(
        {
          finsert: {
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
