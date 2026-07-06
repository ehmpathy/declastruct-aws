import { type ContextLogTrail, genLogMethods, LogLevel } from 'sdk-logs';

import { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { getCredentials } from '@src/domain.operations/provider/getDeclastructAwsProvider';

/**
 * .what = creates a sample AWS API context for testing
 * .why = provides consistent test context across unit and integration tests
 */
export const getSampleAwsApiContext = async (input?: {
  cacheDir?: string;
}): Promise<ContextAwsApi & ContextLogTrail> => ({
  aws: {
    credentials: await getCredentials(),
    cache: {
      DeclaredAwsSsmVpcTunnel: {
        processes: {
          dir: input?.cacheDir ?? '/tmp/declastruct-test/tunnels',
        },
      },
      DeclaredAwsSsmSshTunnel: {
        processes: {
          dir: input?.cacheDir ?? '/tmp/declastruct-test/ssh-tunnels',
        },
      },
    },
  },
  log: genLogMethods({ level: { minimum: LogLevel.ERROR } }),
});
