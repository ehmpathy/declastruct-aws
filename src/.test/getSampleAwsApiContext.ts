import type { ContextLogTrail } from 'simple-log-methods';

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
      DeclaredAwsVpcTunnel: {
        processes: {
          dir: input?.cacheDir ?? '/tmp/declastruct-test/tunnels',
        },
      },
    },
  },
  log: {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  },
});
