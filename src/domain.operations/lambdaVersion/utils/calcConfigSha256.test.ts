import { given, then, when } from 'test-fns';

import {
  calcConfigSha256,
  DeclaredAwsLambdaConfigFields,
} from './calcConfigSha256';

describe('calcConfigSha256', () => {
  given('a lambda configuration', () => {
    when('hash is computed', () => {
      let result: string;

      const lambda: DeclaredAwsLambdaConfigFields = {
        runtime: 'nodejs18.x',
        role: { name: 'lambda-role' },
        handler: 'index.handler',
        timeout: 30,
        memory: 128,
        envars: { NODE_ENV: 'production' },
      };

      then('it should return a hash string', () => {
        result = calcConfigSha256({ of: lambda });
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });

      then('it should be a base64 encoded sha256', () => {
        result = calcConfigSha256({ of: lambda });
        // base64 sha256 is always 44 characters
        expect(result.length).toBe(44);
      });
    });
  });

  given('two lambdas with identical configurations', () => {
    when('hashes are computed', () => {
      then('they should produce the same hash', () => {
        const config1: DeclaredAwsLambdaConfigFields = {
          runtime: 'nodejs18.x',
          role: { name: 'lambda-role' },
          handler: 'index.handler',
          timeout: 30,
          memory: 128,
          envars: { NODE_ENV: 'production' },
        };

        const config2: DeclaredAwsLambdaConfigFields = {
          runtime: 'nodejs18.x',
          role: { name: 'lambda-role' },
          handler: 'index.handler',
          timeout: 30,
          memory: 128,
          envars: { NODE_ENV: 'production' },
        };

        const hash1 = calcConfigSha256({ of: config1 });
        const hash2 = calcConfigSha256({ of: config2 });

        expect(hash1).toBe(hash2);
      });
    });
  });

  given('two configs with different timeouts', () => {
    when('hashes are computed', () => {
      then('they should produce different hashes', () => {
        const config1: DeclaredAwsLambdaConfigFields = {
          runtime: 'nodejs18.x',
          role: { name: 'lambda-role' },
          handler: 'index.handler',
          timeout: 30,
          memory: 128,
          envars: {},
        };

        const config2: DeclaredAwsLambdaConfigFields = {
          runtime: 'nodejs18.x',
          role: { name: 'lambda-role' },
          handler: 'index.handler',
          timeout: 60, // different timeout
          memory: 128,
          envars: {},
        };

        const hash1 = calcConfigSha256({ of: config1 });
        const hash2 = calcConfigSha256({ of: config2 });

        expect(hash1).not.toBe(hash2);
      });
    });
  });

  given('two configs with different envars', () => {
    when('hashes are computed', () => {
      then('they should produce different hashes', () => {
        const config1: DeclaredAwsLambdaConfigFields = {
          runtime: 'nodejs18.x',
          role: { name: 'lambda-role' },
          handler: 'index.handler',
          timeout: 30,
          memory: 128,
          envars: { NODE_ENV: 'production' },
        };

        const config2: DeclaredAwsLambdaConfigFields = {
          runtime: 'nodejs18.x',
          role: { name: 'lambda-role' },
          handler: 'index.handler',
          timeout: 30,
          memory: 128,
          envars: { NODE_ENV: 'development' }, // different envar
        };

        const hash1 = calcConfigSha256({ of: config1 });
        const hash2 = calcConfigSha256({ of: config2 });

        expect(hash1).not.toBe(hash2);
      });
    });
  });
});
