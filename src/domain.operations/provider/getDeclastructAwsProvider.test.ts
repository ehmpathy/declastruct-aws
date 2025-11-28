import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import * as sharedIniFileLoader from '@smithy/shared-ini-file-loader';
import { mockClient } from 'aws-sdk-client-mock';
import { BadRequestError } from 'helpful-errors';
import * as os from 'os';
import * as path from 'path';
import { getError } from 'test-fns';

import { getDeclastructAwsProvider } from './getDeclastructAwsProvider';

jest.mock('@smithy/shared-ini-file-loader');

const stsMock = mockClient(STSClient);

const mockLogContext = {
  log: {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  },
};

describe('getDeclastructAwsProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    stsMock.reset();
    stsMock.on(GetCallerIdentityCommand).resolves({
      Account: '123456789012',
    });
    process.env = { ...originalEnv };

    // default mock: no region in config file
    (sharedIniFileLoader.loadSharedConfigFiles as jest.Mock).mockResolvedValue({
      configFile: {},
      credentialsFile: {},
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('given AWS_REGION env var is set', () => {
    it('should resolve account from STS', async () => {
      process.env.AWS_REGION = 'us-east-1';

      const provider = await getDeclastructAwsProvider({}, mockLogContext);

      expect(stsMock.commandCalls(GetCallerIdentityCommand)).toHaveLength(1);
      expect(provider.context.aws.credentials.account).toBe('123456789012');
    });

    it('should resolve region from env var', async () => {
      process.env.AWS_REGION = 'us-west-2';

      const provider = await getDeclastructAwsProvider({}, mockLogContext);

      expect(provider.context.aws.credentials.region).toBe('us-west-2');
    });

    it('should have default tunnels cache directory', async () => {
      process.env.AWS_REGION = 'us-east-1';

      const provider = await getDeclastructAwsProvider({}, mockLogContext);

      const expectedDir = path.join(os.homedir(), '.declastruct', 'tunnels');
      expect(
        provider.context.aws.cache.DeclaredAwsVpcTunnel.processes.dir,
      ).toBe(expectedDir);
    });

    it('should have all DAOs assembled', async () => {
      process.env.AWS_REGION = 'us-east-1';

      const provider = await getDeclastructAwsProvider({}, mockLogContext);

      expect(provider.daos.DeclaredAwsEc2Instance).toBeDefined();
      expect(provider.daos.DeclaredAwsRdsCluster).toBeDefined();
      expect(provider.daos.DeclaredAwsVpcTunnel).toBeDefined();
    });

    it('should have provider name as aws', async () => {
      process.env.AWS_REGION = 'us-east-1';

      const provider = await getDeclastructAwsProvider({}, mockLogContext);

      expect(provider.name).toBe('aws');
    });
  });

  describe('given custom cache directory', () => {
    it('should use custom cache directory', async () => {
      process.env.AWS_REGION = 'us-east-1';
      const customCacheDir = '/custom/cache/dir';

      const provider = await getDeclastructAwsProvider(
        {
          cache: {
            DeclaredAwsVpcTunnel: {
              processes: {
                dir: customCacheDir,
              },
            },
          },
        },
        mockLogContext,
      );

      expect(
        provider.context.aws.cache.DeclaredAwsVpcTunnel.processes.dir,
      ).toBe(customCacheDir);
    });
  });

  describe('given region in aws config file', () => {
    it('should resolve region from config file when env vars not set', async () => {
      delete process.env.AWS_REGION;
      delete process.env.AWS_DEFAULT_REGION;

      // mock config file with region
      (
        sharedIniFileLoader.loadSharedConfigFiles as jest.Mock
      ).mockResolvedValue({
        configFile: {
          default: { region: 'eu-west-1' },
        },
        credentialsFile: {},
      });

      const provider = await getDeclastructAwsProvider({}, mockLogContext);

      expect(provider.context.aws.credentials.region).toBe('eu-west-1');
    });

    it('should prefer env var over config file', async () => {
      process.env.AWS_REGION = 'us-east-1';

      // mock config file with different region
      (
        sharedIniFileLoader.loadSharedConfigFiles as jest.Mock
      ).mockResolvedValue({
        configFile: {
          default: { region: 'eu-west-1' },
        },
        credentialsFile: {},
      });

      const provider = await getDeclastructAwsProvider({}, mockLogContext);

      expect(provider.context.aws.credentials.region).toBe('us-east-1');
    });

    it('should use AWS_PROFILE when resolving config file region', async () => {
      delete process.env.AWS_REGION;
      delete process.env.AWS_DEFAULT_REGION;
      process.env.AWS_PROFILE = 'myprofile';

      // mock config file with profile-specific region
      (
        sharedIniFileLoader.loadSharedConfigFiles as jest.Mock
      ).mockResolvedValue({
        configFile: {
          default: { region: 'us-east-1' },
          myprofile: { region: 'ap-southeast-2' },
        },
        credentialsFile: {},
      });

      const provider = await getDeclastructAwsProvider({}, mockLogContext);

      expect(provider.context.aws.credentials.region).toBe('ap-southeast-2');
    });
  });

  describe('given no region specified', () => {
    it('should throw BadRequestError', async () => {
      delete process.env.AWS_REGION;
      delete process.env.AWS_DEFAULT_REGION;

      const error = await getError(
        getDeclastructAwsProvider({}, mockLogContext),
      );

      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toContain('AWS region not specified');
    });
  });
});
