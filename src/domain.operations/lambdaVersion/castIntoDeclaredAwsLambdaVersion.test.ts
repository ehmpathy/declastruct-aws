import type { FunctionConfiguration } from '@aws-sdk/client-lambda';
import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { castIntoDeclaredAwsLambdaVersion } from './castIntoDeclaredAwsLambdaVersion';

describe('castIntoDeclaredAwsLambdaVersion', () => {
  // valid base64-encoded sha256 hash for test data (sha256 of 'test')
  const validCodeSha256 = 'n4bQgYhMfWWaL+qgxVrQFaO/TxsrC4Is0V1sFbDwCgg=';

  // helper to create complete function config
  const createFunctionConfig = (
    overrides: Partial<FunctionConfiguration> = {},
  ): FunctionConfiguration => ({
    FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:my-func:5',
    FunctionName: 'my-func',
    Version: '5',
    CodeSha256: validCodeSha256,
    Description: 'Version 5',
    Handler: 'index.handler',
    Runtime: 'nodejs18.x',
    MemorySize: 256,
    Timeout: 30,
    Role: 'arn:aws:iam::123456789012:role/my-role',
    Environment: { Variables: { NODE_ENV: 'production' } },
    ...overrides,
  });

  given('a function configuration with all properties', () => {
    when('cast to domain object', () => {
      let result: ReturnType<typeof castIntoDeclaredAwsLambdaVersion>;

      then('it should cast', () => {
        const functionConfig = createFunctionConfig();
        const lambda = { name: 'my-func' };

        result = castIntoDeclaredAwsLambdaVersion({
          functionConfig,
          lambda,
        });
      });

      then('it should have all properties mapped', () => {
        expect(result).toMatchObject({
          arn: 'arn:aws:lambda:us-east-1:123456789012:function:my-func:5',
          version: '5',
          description: 'Version 5',
        });
        expect(result.lambda).toMatchObject({
          name: 'my-func',
        });
        // hash.code should be present (converted from base64 to hex)
        expect(result.hash.code).toBeDefined();
        expect(typeof result.hash.code).toBe('string');
        // hash.config should be computed
        expect(result.hash.config).toBeDefined();
        expect(typeof result.hash.config).toBe('string');
      });
    });
  });

  given('a function configuration without version', () => {
    when('cast to domain object', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const functionConfig = createFunctionConfig({ Version: undefined });
        const error = await getError(() =>
          castIntoDeclaredAwsLambdaVersion({
            functionConfig,
            lambda: { name: 'my-func' },
          }),
        );
        expect(error.message).toContain('lacks version');
      });
    });
  });

  given('a function configuration without arn', () => {
    when('cast to domain object', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const functionConfig = createFunctionConfig({ FunctionArn: undefined });
        const error = await getError(() =>
          castIntoDeclaredAwsLambdaVersion({
            functionConfig,
            lambda: { name: 'my-func' },
          }),
        );
        expect(error.message).toContain('lacks arn');
      });
    });
  });

  given('a function configuration without codeSha256', () => {
    when('cast to domain object', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const functionConfig = createFunctionConfig({ CodeSha256: undefined });
        const error = await getError(() =>
          castIntoDeclaredAwsLambdaVersion({
            functionConfig,
            lambda: { name: 'my-func' },
          }),
        );
        expect(error.message).toContain('lacks codeSha256');
      });
    });
  });

  given('a function configuration without handler', () => {
    when('cast to domain object', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const functionConfig = createFunctionConfig({ Handler: undefined });
        const error = await getError(() =>
          castIntoDeclaredAwsLambdaVersion({
            functionConfig,
            lambda: { name: 'my-func' },
          }),
        );
        expect(error.message).toContain('lacks handler');
      });
    });
  });

  given('a function configuration with empty description', () => {
    when('cast to domain object', () => {
      let result: ReturnType<typeof castIntoDeclaredAwsLambdaVersion>;

      then('it should cast with undefined description', () => {
        const functionConfig = createFunctionConfig({ Description: '' });
        result = castIntoDeclaredAwsLambdaVersion({
          functionConfig,
          lambda: { name: 'my-func' },
        });
      });

      then('description should be undefined to avoid spurious diffs', () => {
        expect(result.description).toBeUndefined();
      });
    });
  });

  given('two function configs with same config but different code', () => {
    // two distinct valid base64-encoded sha256 hashes
    const codeSha256A = 'n4bQgYhMfWWaL+qgxVrQFaO/TxsrC4Is0V1sFbDwCgg='; // sha256('test')
    const codeSha256B = 'LCa0a2j/xo/5m0U8HTBBNBNCLXBkg7+g+YpeiGJm564='; // sha256('foo')

    when('cast to domain objects', () => {
      then('they should have same hash.config', () => {
        const config1 = createFunctionConfig({ CodeSha256: codeSha256A });
        const config2 = createFunctionConfig({ CodeSha256: codeSha256B });

        const result1 = castIntoDeclaredAwsLambdaVersion({
          functionConfig: config1,
          lambda: { name: 'my-func' },
        });
        const result2 = castIntoDeclaredAwsLambdaVersion({
          functionConfig: config2,
          lambda: { name: 'my-func' },
        });

        expect(result1.hash.config).toBe(result2.hash.config);
      });
    });
  });

  given('two function configs with different memory', () => {
    when('cast to domain objects', () => {
      then('they should have different hash.config', () => {
        const config1 = createFunctionConfig({ MemorySize: 256 });
        const config2 = createFunctionConfig({ MemorySize: 512 });

        const result1 = castIntoDeclaredAwsLambdaVersion({
          functionConfig: config1,
          lambda: { name: 'my-func' },
        });
        const result2 = castIntoDeclaredAwsLambdaVersion({
          functionConfig: config2,
          lambda: { name: 'my-func' },
        });

        expect(result1.hash.config).not.toBe(result2.hash.config);
      });
    });
  });
});
