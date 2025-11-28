import type { ContextLogTrail } from 'simple-log-methods';

import { ContextAwsApi } from '../domain.objects/ContextAwsApi';

/**
 * .what = creates a sample AWS API context for testing
 * .why = provides consistent test context across unit and integration tests
 */
export const getSampleAwsApiContext = (input?: {
  cacheDir?: string;
}): ContextAwsApi & ContextLogTrail => ({
  aws: {
    credentials: {
      region: process.env.AWS_REGION ?? 'us-east-1',
      account: process.env.AWS_ACCOUNT ?? '123456789012',
    },
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
