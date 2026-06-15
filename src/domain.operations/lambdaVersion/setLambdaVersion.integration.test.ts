import type { Hash } from 'hash-fns';
import { UnexpectedCodePathError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import { getOneLambda } from '@src/domain.operations/lambda/getOneLambda';

import { getOneLambdaVersion } from './getOneLambdaVersion';
import { setLambdaVersion } from './setLambdaVersion';
import { calcAwsLambdaConfigHash } from './utils/calcAwsLambdaConfigHash';

describe('setLambdaVersion', () => {
  const context = useBeforeAll(() => getSampleAwsApiContext());

  // use the same lambda created by setLambda.integration.test.ts
  const testLambdaName = 'declastruct-test-lambda';

  given('an extant lambda function', () => {
    then('we should be able to publish a version', async () => {
      // get the current lambda state
      const lambda = await getOneLambda(
        { by: { unique: { name: testLambdaName } } },
        context,
      );

      expect(lambda).not.toBeNull();
      if (!lambda) return;

      // lambda must have code.hash to publish
      if (!lambda.code?.hash) {
        throw UnexpectedCodePathError.throw('lambda lacks code.hash', {
          lambda,
        });
      }

      // compute config hash
      const configHash = calcAwsLambdaConfigHash({ of: lambda });

      // publish a version
      const version = await setLambdaVersion(
        {
          findsert: {
            lambda: { name: testLambdaName },
            hash: {
              code: lambda.code.hash,
              config: configHash,
            },
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

      // lambda must have code.hash to publish
      if (!lambda.code?.hash) {
        throw UnexpectedCodePathError.throw('lambda lacks code.hash', {
          lambda,
        });
      }

      // compute config hash
      const configHash = calcAwsLambdaConfigHash({ of: lambda });

      // publish same version again - should return extant
      const version = await setLambdaVersion(
        {
          findsert: {
            lambda: { name: testLambdaName },
            hash: {
              code: lambda.code.hash,
              config: configHash,
            },
          },
        },
        context,
      );

      expect(version.lambda.name).toBe(testLambdaName);
      console.log('Idempotent version:', version);
    });
  });

  given('[boundary] different hash combinations', () => {
    when('[t0] code hash differs from extant version', () => {
      // different code hash = different code artifact = no version found
      const differentCodeHash =
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Hash;

      then('getOneLambdaVersion returns null (version not found)', async () => {
        const lambda = await getOneLambda(
          { by: { unique: { name: testLambdaName } } },
          context,
        );
        if (!lambda?.code?.hash) {
          throw UnexpectedCodePathError.throw('lambda lacks code.hash', {
            lambda,
          });
        }

        const configHash = calcAwsLambdaConfigHash({ of: lambda });

        // lookup with correct config but different code hash
        const result = await getOneLambdaVersion(
          {
            by: {
              unique: {
                lambda: { name: testLambdaName },
                hash: {
                  code: differentCodeHash,
                  config: configHash,
                },
              },
            },
          },
          context,
        );

        expect(result).toBeNull();
      });
    });

    when('[t1] config hash differs from extant version', () => {
      // different config hash = different config state = no version found
      const differentConfigHash =
        'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as Hash;

      then('getOneLambdaVersion returns null (version not found)', async () => {
        const lambda = await getOneLambda(
          { by: { unique: { name: testLambdaName } } },
          context,
        );
        if (!lambda?.code?.hash) {
          throw UnexpectedCodePathError.throw('lambda lacks code.hash', {
            lambda,
          });
        }

        // lookup with correct code but different config hash
        const result = await getOneLambdaVersion(
          {
            by: {
              unique: {
                lambda: { name: testLambdaName },
                hash: {
                  code: lambda.code.hash,
                  config: differentConfigHash,
                },
              },
            },
          },
          context,
        );

        expect(result).toBeNull();
      });
    });

    when('[t2] both hashes differ from extant version', () => {
      const differentCodeHash =
        'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' as Hash;
      const differentConfigHash =
        'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd' as Hash;

      then('getOneLambdaVersion returns null (version not found)', async () => {
        const result = await getOneLambdaVersion(
          {
            by: {
              unique: {
                lambda: { name: testLambdaName },
                hash: {
                  code: differentCodeHash,
                  config: differentConfigHash,
                },
              },
            },
          },
          context,
        );

        expect(result).toBeNull();
      });
    });
  });
});
