import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { getError, given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import { setVpcTunnel } from './setVpcTunnel';
import { getTunnelHash } from './utils/getTunnelHash';

// note: setVpcTunnel requires integration testing since it spawns real aws ssm processes
// these unit tests focus on the CLOSED status path which can be tested without AWS

describe('setVpcTunnel', () => {
  const tunnelRef = {
    account: '123456789012',
    region: 'us-east-1',
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
        expect(result).toMatchSnapshot();
      });
    });

    when('cache file exists with dead process', () => {
      let result: Awaited<ReturnType<typeof setVpcTunnel>>;

      then('it should cleanup and return CLOSED', async () => {
        const cacheDir = path.join(os.tmpdir(), `tunnel-test-${Date.now()}`);
        await fs.mkdir(cacheDir, { recursive: true });

        // write cache file with invalid pid
        const context = getMockedAwsApiContext({ cacheDir });
        const hash = getTunnelHash({ for: { tunnel: tunnelRef } });
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
        expect(result).toMatchSnapshot();
      });
    });
  });

  // note: OPEN status tests require integration tests with real AWS SSM
  // see setVpcTunnel.integration.test.ts for full coverage

  given('negative path: corrupted cache file on CLOSED request', () => {
    when('cache file contains invalid JSON', () => {
      then('it should throw parse error', async () => {
        const cacheDir = path.join(os.tmpdir(), `tunnel-test-${Date.now()}`);
        await fs.mkdir(cacheDir, { recursive: true });

        // write corrupted cache file
        const context = getMockedAwsApiContext({ cacheDir });
        const hash = getTunnelHash({ for: { tunnel: tunnelRef } });
        const cacheFilePath = path.join(cacheDir, `${hash}.json`);
        await fs.writeFile(cacheFilePath, 'not valid json {{{');

        const error = await getError(
          setVpcTunnel({ ...tunnelRef, status: 'CLOSED' }, context),
        );

        expect(error).toBeInstanceOf(SyntaxError);
        expect(error.message).toContain('JSON');

        await fs.rm(cacheDir, { recursive: true });
      });
    });
  });
});
