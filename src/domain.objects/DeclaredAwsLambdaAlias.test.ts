import { given, then, when } from 'test-fns';

import { DeclaredAwsLambdaAlias } from './DeclaredAwsLambdaAlias';

describe('DeclaredAwsLambdaAlias', () => {
  given('a valid alias name and references', () => {
    when('instantiated', () => {
      let alias: DeclaredAwsLambdaAlias;

      then('it should instantiate', () => {
        alias = new DeclaredAwsLambdaAlias({
          name: 'expect-LIVE',
          lambda: { name: 'my-function' },
          version: {
            lambda: { name: 'my-function' },
            codeSha256: 'abc',
            configSha256: 'def',
          },
        });
      });

      then('it should have the alias name', () => {
        expect(alias.name).toBe('expect-LIVE');
      });

      then('it should have the lambda reference', () => {
        expect(alias.lambda).toMatchObject({
          name: 'my-function',
        });
      });

      then('it should have the version reference', () => {
        expect(alias.version).toMatchObject({
          codeSha256: 'abc',
          configSha256: 'def',
        });
      });

      then('metadata is undefined by default', () => {
        expect(alias.arn).toBeUndefined();
      });
    });
  });

  given('all properties provided', () => {
    when('instantiated with metadata and routing config', () => {
      let alias: DeclaredAwsLambdaAlias;

      then('it should instantiate', () => {
        alias = new DeclaredAwsLambdaAlias({
          arn: 'arn:aws:lambda:us-east-1:123456789012:function:my-func:LIVE',
          name: 'LIVE',
          lambda: { name: 'my-func' },
          version: {
            lambda: { name: 'my-func' },
            codeSha256: 'abc',
            configSha256: 'def',
          },
          description: 'Production alias',
          routingConfig: {
            additionalVersionWeights: { '6': 0.1 },
          },
        });
      });

      then('it should have all properties', () => {
        expect(alias).toMatchObject({
          arn: 'arn:aws:lambda:us-east-1:123456789012:function:my-func:LIVE',
          name: 'LIVE',
          description: 'Production alias',
        });
        expect(alias.routingConfig?.additionalVersionWeights).toEqual({
          '6': 0.1,
        });
      });
    });
  });

  given('the static keys', () => {
    then('primary is defined as arn', () => {
      expect(DeclaredAwsLambdaAlias.primary).toEqual(['arn']);
    });

    then('unique is defined as lambda and name', () => {
      expect(DeclaredAwsLambdaAlias.unique).toEqual(['lambda', 'name']);
    });

    then('metadata is defined as arn', () => {
      expect(DeclaredAwsLambdaAlias.metadata).toEqual(['arn']);
    });

    then(
      'readonly is empty (version and routingConfig are user-updatable)',
      () => {
        expect(DeclaredAwsLambdaAlias.readonly).toEqual([]);
      },
    );
  });
});
