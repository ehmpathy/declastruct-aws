import type { AliasConfiguration } from '@aws-sdk/client-lambda';
import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { castIntoDeclaredAwsLambdaAlias } from './castIntoDeclaredAwsLambdaAlias';

describe('castIntoDeclaredAwsLambdaAlias', () => {
  given('an alias configuration with all properties', () => {
    when('cast to domain object', () => {
      let result: ReturnType<typeof castIntoDeclaredAwsLambdaAlias>;

      then('it should cast', () => {
        const aliasConfig: AliasConfiguration = {
          AliasArn:
            'arn:aws:lambda:us-east-1:123456789012:function:my-func:LIVE',
          Name: 'LIVE',
          FunctionVersion: '5',
          Description: 'Production alias',
          RoutingConfig: {
            AdditionalVersionWeights: { '6': 0.1 },
          },
        };
        const lambda = { name: 'my-func' };
        const version = {
          lambda,
          codeSha256: 'abc',
          configSha256: 'def',
        };

        result = castIntoDeclaredAwsLambdaAlias({
          aliasConfig,
          lambda,
          version,
        });
      });

      then('it should have all properties mapped', () => {
        expect(result).toMatchObject({
          arn: 'arn:aws:lambda:us-east-1:123456789012:function:my-func:LIVE',
          name: 'LIVE',
          description: 'Production alias',
        });
        expect(result.routingConfig?.additionalVersionWeights).toEqual({
          '6': 0.1,
        });
      });
    });
  });

  given('an alias configuration without name', () => {
    when('cast to domain object', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const aliasConfig: AliasConfiguration = {
          AliasArn:
            'arn:aws:lambda:us-east-1:123456789012:function:my-func:LIVE',
          FunctionVersion: '5',
        };
        const error = await getError(() =>
          castIntoDeclaredAwsLambdaAlias({
            aliasConfig,
            lambda: { name: 'my-func' },
            version: {
              lambda: { name: 'my-func' },
              codeSha256: 'abc',
              configSha256: 'def',
            },
          }),
        );
        expect(error.message).toContain('lacks name');
      });
    });
  });

  given('an alias configuration without arn', () => {
    when('cast to domain object', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const aliasConfig: AliasConfiguration = {
          Name: 'LIVE',
          FunctionVersion: '5',
        };
        const error = await getError(() =>
          castIntoDeclaredAwsLambdaAlias({
            aliasConfig,
            lambda: { name: 'my-func' },
            version: {
              lambda: { name: 'my-func' },
              codeSha256: 'abc',
              configSha256: 'def',
            },
          }),
        );
        expect(error.message).toContain('lacks arn');
      });
    });
  });

  given('an alias configuration without routing config', () => {
    when('cast to domain object', () => {
      let result: ReturnType<typeof castIntoDeclaredAwsLambdaAlias>;

      then('it should cast with undefined routing config', () => {
        const aliasConfig: AliasConfiguration = {
          AliasArn:
            'arn:aws:lambda:us-east-1:123456789012:function:my-func:LIVE',
          Name: 'LIVE',
          FunctionVersion: '5',
        };
        result = castIntoDeclaredAwsLambdaAlias({
          aliasConfig,
          lambda: { name: 'my-func' },
          version: {
            lambda: { name: 'my-func' },
            codeSha256: 'abc',
            configSha256: 'def',
          },
        });
      });

      then('routing config should be undefined', () => {
        expect(result.routingConfig).toBeUndefined();
      });
    });
  });
});
