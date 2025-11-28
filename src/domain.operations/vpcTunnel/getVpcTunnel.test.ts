import * as fs from 'fs/promises';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import { getVpcTunnel } from './getVpcTunnel';
import { getTunnelHash } from './utils/getTunnelHash';

describe('getVpcTunnel', () => {
  given('no cache file exists', () => {
    when('getVpcTunnel is called', () => {
      then('it should return CLOSED status with no pid', async () => {
        const cacheDir = path.join(os.tmpdir(), `tunnel-test-${Date.now()}`);
        await fs.mkdir(cacheDir, { recursive: true });

        const tunnelRef = {
          via: {
            mechanism: 'aws.ssm' as const,
            bastion: { exid: 'test-bastion' },
          },
          into: { cluster: { name: 'test-db' } },
          from: { host: 'localhost', port: 19876 },
        };

        const result = await getVpcTunnel(
          { by: { unique: tunnelRef } },
          getSampleAwsApiContext({ cacheDir }),
        );

        expect(result.status).toBe('CLOSED');
        expect(result.pid).toBeNull();

        await fs.rm(cacheDir, { recursive: true });
      });
    });
  });

  given('a cache file with dead process', () => {
    when('getVpcTunnel is called', () => {
      then('it should return CLOSED status', async () => {
        const cacheDir = path.join(os.tmpdir(), `tunnel-test-${Date.now()}`);
        await fs.mkdir(cacheDir, { recursive: true });

        const tunnelRef = {
          via: {
            mechanism: 'aws.ssm' as const,
            bastion: { exid: 'test-bastion-dead' },
          },
          into: { cluster: { name: 'test-db-dead' } },
          from: { host: 'localhost', port: 19879 },
        };

        // write cache file with invalid pid
        const context = getSampleAwsApiContext({ cacheDir });
        const hash = getTunnelHash({ for: { tunnel: tunnelRef } }, context);
        const cacheFilePath = path.join(cacheDir, `${hash}.json`);
        await fs.writeFile(
          cacheFilePath,
          JSON.stringify({ pid: 999999999, tunnel: tunnelRef }),
        );

        const result = await getVpcTunnel(
          { by: { unique: tunnelRef } },
          context,
        );

        expect(result.status).toBe('CLOSED');

        await fs.rm(cacheDir, { recursive: true });
      });
    });
  });

  given('a cache file with alive process but unhealthy tunnel', () => {
    when('getVpcTunnel is called', () => {
      then('it should return CLOSED status with pid', async () => {
        const cacheDir = path.join(os.tmpdir(), `tunnel-test-${Date.now()}`);
        await fs.mkdir(cacheDir, { recursive: true });

        // use a port that is not bound (unhealthy)
        const tunnelRef = {
          via: {
            mechanism: 'aws.ssm' as const,
            bastion: { exid: 'test-bastion-unhealthy' },
          },
          into: { cluster: { name: 'test-db-unhealthy' } },
          from: { host: 'localhost', port: 19880 },
        };

        // write cache with current process pid (alive) but port not bound (unhealthy)
        const context = getSampleAwsApiContext({ cacheDir });
        const hash = getTunnelHash({ for: { tunnel: tunnelRef } }, context);
        const cacheFilePath = path.join(cacheDir, `${hash}.json`);
        await fs.writeFile(
          cacheFilePath,
          JSON.stringify({ pid: process.pid, tunnel: tunnelRef }),
        );

        const result = await getVpcTunnel(
          { by: { unique: tunnelRef } },
          context,
        );

        expect(result.status).toBe('CLOSED');
        expect(result.pid).toBeNull();

        await fs.rm(cacheDir, { recursive: true });
      });
    });
  });

  given('a cache file with alive process and healthy tunnel', () => {
    when('getVpcTunnel is called', () => {
      then('it should return OPEN status with pid', async () => {
        const cacheDir = path.join(os.tmpdir(), `tunnel-test-${Date.now()}`);
        await fs.mkdir(cacheDir, { recursive: true });

        // start a server to make port healthy
        const server = net.createServer();
        await new Promise<void>((resolve) => {
          server.listen(19881, '127.0.0.1', () => resolve());
        });

        const tunnelRef = {
          via: {
            mechanism: 'aws.ssm' as const,
            bastion: { exid: 'test-bastion-healthy' },
          },
          into: { cluster: { name: 'test-db-healthy' } },
          from: { host: 'localhost', port: 19881 },
        };

        const context = getSampleAwsApiContext({ cacheDir });
        const hash = getTunnelHash({ for: { tunnel: tunnelRef } }, context);
        const cacheFilePath = path.join(cacheDir, `${hash}.json`);
        await fs.writeFile(
          cacheFilePath,
          JSON.stringify({ pid: process.pid, tunnel: tunnelRef }),
        );

        const result = await getVpcTunnel(
          { by: { unique: tunnelRef } },
          context,
        );

        expect(result.status).toBe('OPEN');
        expect(result.pid).toBe(process.pid);

        server.close();
        await fs.rm(cacheDir, { recursive: true });
      });
    });
  });
});
