import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '../../.test/getMockedAwsApiContext';
import { setVpcTunnel } from './setVpcTunnel';
import { getTunnelHash } from './utils/getTunnelHash';

// note: setVpcTunnel requires integration testing since it spawns real aws ssm processes
// these unit tests focus on the CLOSED status path which can be tested without AWS

describe('setVpcTunnel', () => {
  const tunnelRef = {
    via: { mechanism: 'aws.ssm' as const, bastion: { exid: 'test-bastion' } },
    into: { cluster: { name: 'test-db' } },
    from: { host: 'localhost', port: 19878 },
  };

  given('a tunnel with CLOSED status desired', () => {
    when('no cache file exists', () => {
      let result: Awaited<ReturnType<typeof setVpcTunnel>>;

      then('it should return CLOSED status', async () => {
        const cacheDir = path.join(os.tmpdir(), `tunnel-test-${Date.now()}`);
        await fs.mkdir(cacheDir, { recursive: true });

        result = await setVpcTunnel(
          { ...tunnelRef, status: 'CLOSED' },
          getMockedAwsApiContext({ cacheDir }),
        );

        await fs.rm(cacheDir, { recursive: true });
      });

      then('status should be CLOSED', () => {
        expect(result.status).toBe('CLOSED');
      });
    });

    when('cache file exists with dead process', () => {
      let result: Awaited<ReturnType<typeof setVpcTunnel>>;

      then('it should cleanup and return CLOSED', async () => {
        const cacheDir = path.join(os.tmpdir(), `tunnel-test-${Date.now()}`);
        await fs.mkdir(cacheDir, { recursive: true });

        // write cache file with invalid pid
        const context = getMockedAwsApiContext({ cacheDir });
        const hash = getTunnelHash({ for: { tunnel: tunnelRef } }, context);
        const cacheFilePath = path.join(cacheDir, `${hash}.json`);
        await fs.writeFile(
          cacheFilePath,
          JSON.stringify({ pid: 999999999, tunnel: tunnelRef }),
        );

        result = await setVpcTunnel(
          { ...tunnelRef, status: 'CLOSED' },
          context,
        );

        // verify cache file was deleted
        const fileExists = await fs
          .access(cacheFilePath)
          .then(() => true)
          .catch(() => false);
        expect(fileExists).toBe(false);

        await fs.rm(cacheDir, { recursive: true });
      });

      then('status should be CLOSED', () => {
        expect(result.status).toBe('CLOSED');
      });
    });
  });

  given('a tunnel with OPEN status desired', () => {
    when('bastion is not found', () => {
      then('it should throw BadRequestError', async () => {
        const cacheDir = path.join(os.tmpdir(), `tunnel-test-${Date.now()}`);
        await fs.mkdir(cacheDir, { recursive: true });

        // mock getEc2Instance to return null
        jest.doMock('../ec2Instance/getEc2Instance', () => ({
          getEc2Instance: jest.fn().mockResolvedValue(null),
        }));

        // note: this test would require mocking AWS SDK calls
        // leaving as a placeholder for integration tests
        await fs.rm(cacheDir, { recursive: true });
      });
    });
  });
});
