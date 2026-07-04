import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';

import { setSsmVpcTunnel } from './setSsmVpcTunnel';

/**
 * integration tests for setSsmVpcTunnel
 *
 * .note = OPEN path tests require:
 *   - real aws credentials with ssm access
 *   - real bastion ec2 instance with ssm agent
 *   - real rds cluster
 *
 * these tests verify the CLOSED path which only requires credentials.
 * OPEN path tests should be run in a consumer repo with real infrastructure.
 */
describe('setSsmVpcTunnel.integration', () => {
  given('real aws credentials', () => {
    when('setSsmVpcTunnel is called with CLOSED status', () => {
      then('it should return the tunnel in CLOSED state', async () => {
        const cacheDir = path.join(
          os.tmpdir(),
          `tunnel-integration-${Date.now()}`,
        );
        await fs.mkdir(cacheDir, { recursive: true });

        const context = await getSampleAwsApiContext({ cacheDir });

        const result = await setSsmVpcTunnel(
          {
            account: context.aws.credentials.account ?? '000000000000',
            region: context.aws.credentials.region ?? 'us-east-1',
            via: {
              mechanism: 'aws.ssm',
              bastion: { exid: 'test-bastion-integration' },
            },
            into: { cluster: { name: 'test-db-integration' } },
            from: { host: 'localhost', port: 29876 },
            status: 'CLOSED',
          },
          context,
        );

        expect(result.status).toBe('CLOSED');
        expect(result.pid).toBeNull();
        expect(result.account).toBeDefined();
        expect(result.region).toBeDefined();
        // snapshot uses full result for consistent format with unit tests
        expect(result).toMatchSnapshot();

        await fs.rm(cacheDir, { recursive: true });
      });
    });
  });
});
