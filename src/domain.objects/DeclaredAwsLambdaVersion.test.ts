import { given, then, when } from 'test-fns';

import { DeclaredAwsLambdaVersion } from './DeclaredAwsLambdaVersion';

describe('DeclaredAwsLambdaVersion', () => {
  given('a valid lambda reference and hashes', () => {
    when('instantiated', () => {
      let version: DeclaredAwsLambdaVersion;

      then('it should instantiate', () => {
        version = new DeclaredAwsLambdaVersion({
          lambda: { name: 'my-function' },
          codeSha256: 'abc123hash',
          configSha256: 'def456hash',
        });
      });

      then('it should have the lambda reference', () => {
        expect(version.lambda).toMatchObject({
          name: 'my-function',
        });
      });

      then('it should have the code hash', () => {
        expect(version.codeSha256).toBe('abc123hash');
      });

      then('it should have the config hash', () => {
        expect(version.configSha256).toBe('def456hash');
      });

      then('metadata is undefined by default', () => {
        expect(version.arn).toBeUndefined();
        expect(version.version).toBeUndefined();
      });
    });
  });

  given('all properties provided', () => {
    when('instantiated with metadata and readonly', () => {
      let version: DeclaredAwsLambdaVersion;

      then('it should instantiate', () => {
        version = new DeclaredAwsLambdaVersion({
          arn: 'arn:aws:lambda:us-east-1:123456789012:function:my-func:5',
          version: '5',
          lambda: { name: 'my-func' },
          codeSha256: 'abc123',
          configSha256: 'def456',
          description: 'Version 5 deployment',
        });
      });

      then('it should have all properties', () => {
        expect(version).toMatchObject({
          arn: 'arn:aws:lambda:us-east-1:123456789012:function:my-func:5',
          version: '5',
          codeSha256: 'abc123',
          configSha256: 'def456',
          description: 'Version 5 deployment',
        });
      });
    });
  });

  given('the static keys', () => {
    then('primary is defined as arn', () => {
      expect(DeclaredAwsLambdaVersion.primary).toEqual(['arn']);
    });

    then('unique is defined as lambda, codeSha256, configSha256', () => {
      expect(DeclaredAwsLambdaVersion.unique).toEqual([
        'lambda',
        'codeSha256',
        'configSha256',
      ]);
    });

    then('metadata is defined as arn', () => {
      expect(DeclaredAwsLambdaVersion.metadata).toEqual(['arn']);
    });

    then('readonly is defined as version', () => {
      expect(DeclaredAwsLambdaVersion.readonly).toEqual(['version']);
    });
  });
});
