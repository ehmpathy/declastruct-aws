import type { FunctionConfiguration } from '@aws-sdk/client-lambda';
import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { castIntoDeclaredAwsLambdaVersion } from './castIntoDeclaredAwsLambdaVersion';

describe('castIntoDeclaredAwsLambdaVersion', () => {
  // helper to create complete function config
  const createFunctionConfig = (
    overrides: Partial<FunctionConfiguration> = {},
  ): FunctionConfiguration => ({
    FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:my-func:5',
    FunctionName: 'my-func',
    Version: '5',
    CodeSha256: 'abc123codesha',
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
          codeSha256: 'abc123codesha',
          description: 'Version 5',
        });
        expect(result.lambda).toMatchObject({
          name: 'my-func',
        });
        // configSha256 should be computed
        expect(result.configSha256).toBeDefined();
        expect(typeof result.configSha256).toBe('string');
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
    when('cast to domain objects', () => {
      then('they should have same configSha256', () => {
        const config1 = createFunctionConfig({ CodeSha256: 'code1' });
        const config2 = createFunctionConfig({ CodeSha256: 'code2' });

        const result1 = castIntoDeclaredAwsLambdaVersion({
          functionConfig: config1,
          lambda: { name: 'my-func' },
        });
        const result2 = castIntoDeclaredAwsLambdaVersion({
          functionConfig: config2,
          lambda: { name: 'my-func' },
        });

        expect(result1.configSha256).toBe(result2.configSha256);
      });
    });
  });

  given('two function configs with different memory', () => {
    when('cast to domain objects', () => {
      then('they should have different configSha256', () => {
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

        expect(result1.configSha256).not.toBe(result2.configSha256);
      });
    });
  });
});
