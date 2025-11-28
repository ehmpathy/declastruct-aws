import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

import { getDeclastructAwsProvider } from './getDeclastructAwsProvider';

describe('getDeclastructAwsProvider', () => {
  given('default configuration', () => {
    when('created with minimal input', () => {
      const provider = getDeclastructAwsProvider(
        {},
        {
          log: {
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {},
          },
        },
      );

      then('it should have default tunnels cache directory', () => {
        const expectedDir = path.join(os.homedir(), '.declastruct', 'tunnels');
        expect(
          provider.context.aws.cache.DeclaredAwsVpcTunnel.processes.dir,
        ).toBe(expectedDir);
      });

      then('it should have all DAOs assembled', () => {
        expect(provider.daos.DeclaredAwsEc2Instance).toBeDefined();
        expect(provider.daos.DeclaredAwsRdsCluster).toBeDefined();
        expect(provider.daos.DeclaredAwsVpcTunnel).toBeDefined();
      });

      then('it should have provider name as aws', () => {
        expect(provider.name).toBe('aws');
      });
    });
  });

  given('custom configuration', () => {
    when('created with custom credentials and cache dir', () => {
      const customCacheDir = '/custom/cache/dir';
      const provider = getDeclastructAwsProvider(
        {
          credentials: {
            region: 'us-west-2',
            account: '123456789012',
          },
          cache: {
            DeclaredAwsVpcTunnel: {
              processes: {
                dir: customCacheDir,
              },
            },
          },
        },
        {
          log: {
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {},
          },
        },
      );

      then('it should use custom cache directory', () => {
        expect(
          provider.context.aws.cache.DeclaredAwsVpcTunnel.processes.dir,
        ).toBe(customCacheDir);
      });

      then('it should use custom credentials', () => {
        expect(provider.context.aws.credentials.region).toBe('us-west-2');
        expect(provider.context.aws.credentials.account).toBe('123456789012');
      });
    });
  });
});
