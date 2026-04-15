import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';

import { getVpcTunnel } from './getVpcTunnel';

/**
 * integration tests for getVpcTunnel
 *
 * .note = OPEN status detection requires:
 *   - real aws credentials with ssm access
 *   - real bastion ec2 instance with ssm agent
 *   - real rds cluster
 *   - an active ssm tunnel session
 *
 * these tests verify the CLOSED path which only requires credentials.
 * OPEN path tests should be run in a consumer repo with real infrastructure.
 */
describe('getVpcTunnel.integration', () => {
  given('real aws credentials', () => {
    when('getVpcTunnel is called for a non-extant tunnel', () => {
      then('it should return CLOSED status with null pid', async () => {
        const cacheDir = path.join(
          os.tmpdir(),
          `tunnel-integration-${Date.now()}`,
        );
        await fs.mkdir(cacheDir, { recursive: true });

        const context = await getSampleAwsApiContext({ cacheDir });

        const result = await getVpcTunnel(
          {
            by: {
              unique: {
                account: context.aws.credentials.account ?? '000000000000',
                region: context.aws.credentials.region ?? 'us-east-1',
                via: {
                  mechanism: 'aws.ssm',
                  bastion: { exid: 'test-bastion-integration-get' },
                },
                into: { cluster: { name: 'test-db-integration-get' } },
                from: { host: 'localhost', port: 29877 },
              },
            },
          },
          context,
        );

        expect(result.status).toBe('CLOSED');
        expect(result.pid).toBeNull();
        expect(result.account).toBeDefined();
        expect(result.region).toBeDefined();
        expect({
          status: result.status,
          pid: result.pid,
          account: result.account,
          region: result.region,
        }).toMatchSnapshot();

        await fs.rm(cacheDir, { recursive: true });
      });
    });
  });
});
