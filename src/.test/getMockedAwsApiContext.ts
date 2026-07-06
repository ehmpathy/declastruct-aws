import { type ContextLogTrail, genLogMethods, LogLevel } from 'sdk-logs';

import { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

/**
 * .what = creates a mocked AWS API context for unit testing
 * .why = provides sync context with fake credentials for tests that mock AWS SDK
 */
export const getMockedAwsApiContext = (input?: {
  cacheDir?: string;
}): ContextAwsApi & ContextLogTrail => ({
  aws: {
    credentials: {
      region: 'us-east-1',
      account: '123456789012',
    },
    cache: {
      DeclaredAwsSsmVpcTunnel: {
        processes: {
          dir: input?.cacheDir ?? '/tmp/declastruct-test/tunnels',
        },
      },
    },
  },
  log: genLogMethods({ level: { minimum: LogLevel.ERROR } }),
});
