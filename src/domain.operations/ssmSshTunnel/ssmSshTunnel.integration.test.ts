import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import { DeclaredAwsSsmSshTunnel } from '@src/domain.objects/DeclaredAwsSsmSshTunnel';

import { getOneSsmSshTunnel } from './getOneSsmSshTunnel';
import { setSsmSshTunnel } from './setSsmSshTunnel';
import { getSshTunnelHash } from './utils/getSshTunnelHash';

/**
 * .what = integration tests for SSH tunnel orchestrators
 * .why = verifies SSH tunnel cache management and status checks
 * .note
 *   - OPEN status requires SSM StartSession permission (demo-agent lacks this)
 *   - CLOSED status tests verify local cache cleanup works
 *   - uses temp directory for test isolation
 */
describe('ssmSshTunnel', () => {
  // give the aws-dependent case (case4) headroom past the global 90s wall.
  // note: getEc2Instance news up an EC2Client with no explicit credentials, so the
  //   sdk re-resolves creds from its default chain on that call. the FIRST such
  //   resolution in a fresh jest process (cold sso-token load / imds fallback) can
  //   exceed 90s once, then is cached; warm runs finish in ~5s. this bump lets the
  //   one cold call complete instead of a wall hit — it does not slow warm runs.
  jest.setTimeout(180_000);

  // unique test dir to isolate from other tests
  const testCacheDir = `/tmp/declastruct-test-ssh-tunnels-${genTestUuid().slice(0, 8)}`;

  // scene setup
  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext({ cacheDir: testCacheDir });

    // ensure cache dir exists
    await fs.mkdir(testCacheDir, { recursive: true });

    return { context };
  });

  // cleanup after all tests
  afterAll(async () => {
    await fs.rm(testCacheDir, { recursive: true, force: true });
  });

  given('[case1] getOneSsmSshTunnel when no cache exists', () => {
    when('[t0] tunnel has never been opened', () => {
      then('returns notconnected status', async () => {
        const { context } = scene;
        const result = await getOneSsmSshTunnel(
          {
            by: {
              unique: {
                instance: { exid: 'nonexistent-instance' },
                from: { port: 22222 },
              },
            },
          },
          context,
        );

        expect(result.status).toBe('CLOSED');
        expect(result.pid).toBeNull();
        expect(result.spawnedAt).toBeNull();
      });
    });
  });

  given('[case2] setSsmSshTunnel to CLOSED status', () => {
    when('[t0] no extant tunnel', () => {
      then('returns CLOSED status (idempotent)', async () => {
        const { context } = scene;
        const result = await setSsmSshTunnel(
          DeclaredAwsSsmSshTunnel.as({
            instance: { exid: 'test-instance-closed' },
            from: { port: 22223 },
            into: { port: 22 },
            status: 'CLOSED',
          }),
          context,
        );

        expect(result.status).toBe('CLOSED');
        expect(result.pid).toBeNull();
        expect(result.spawnedAt).toBeNull();
      });
    });
  });

  given('[case3] tunnel cache file lifecycle', () => {
    const testPort = 22224;
    const testInstanceExid = `test-cache-${genTestUuid().slice(0, 8)}`;

    when('[t0] fake cache file exists with dead pid', () => {
      then('reports notconnected for stale tunnel', async () => {
        const { context } = scene;

        // create fake cache file with dead pid
        const fakeCacheFile = {
          pid: 999999999, // dead pid
          spawnedAt: new Date().toISOString(),
          intoPort: 22,
          tunnel: {
            instance: { exid: testInstanceExid },
            from: { port: testPort },
          },
        };

        // write the cache at the exact path getOneSsmSshTunnel reads, so the
        // dead-pid branch is genuinely exercised (a mismatched name would fall
        // through to the no-cache branch and pass for the wrong reason)
        const tunnelHash = getSshTunnelHash({
          for: {
            tunnel: {
              instance: { exid: testInstanceExid },
              from: { port: testPort },
            },
          },
        });
        const cachePath = path.join(testCacheDir, `${tunnelHash}.json`);
        await fs.writeFile(cachePath, JSON.stringify(fakeCacheFile));

        const result = await getOneSsmSshTunnel(
          {
            by: {
              unique: {
                instance: { exid: testInstanceExid },
                from: { port: testPort },
              },
            },
          },
          context,
        );

        expect(result.status).toBe('CLOSED');
        expect(result.pid).toBeNull();
      });
    });

    when('[t1] close cleans up stale cache', () => {
      then('cache file is removed', async () => {
        const { context } = scene;

        // close the tunnel
        await setSsmSshTunnel(
          DeclaredAwsSsmSshTunnel.as({
            instance: { exid: testInstanceExid },
            from: { port: testPort },
            into: { port: 22 },
            status: 'CLOSED',
          }),
          context,
        );

        // verify get returns closed
        const result = await getOneSsmSshTunnel(
          {
            by: {
              unique: {
                instance: { exid: testInstanceExid },
                from: { port: testPort },
              },
            },
          },
          context,
        );

        expect(result.status).toBe('CLOSED');
      });
    });
  });

  given('[case5] poisoned cache: alive pid but unbound port', () => {
    const testPort = 22226;
    const testInstanceExid = `test-poisoned-${genTestUuid().slice(0, 8)}`;

    when(
      '[t0] cache points at a live process that never bound the port',
      () => {
        then(
          'reports notconnected (port probe overrides pid-alive)',
          async () => {
            const { context } = scene;

            // spawn a real, harmless long-lived process so the pid is genuinely
            // alive — but it never binds the tunnel port. this reproduces the
            // half-open cache a failed startup leaves behind: pid-alive alone would
            // falsely read OPEN, so the port probe must override it.
            const decoy = spawn('sleep', ['30'], {
              detached: true,
              stdio: 'ignore',
            });
            decoy.unref();
            const decoyPid = decoy.pid;
            if (!decoyPid) throw new Error('decoy process did not start');

            try {
              // write the poisoned cache at the exact path getOneSsmSshTunnel reads
              const tunnelHash = getSshTunnelHash({
                for: {
                  tunnel: {
                    instance: { exid: testInstanceExid },
                    from: { port: testPort },
                  },
                },
              });
              const cachePath = path.join(testCacheDir, `${tunnelHash}.json`);
              await fs.writeFile(
                cachePath,
                JSON.stringify({
                  pid: decoyPid,
                  spawnedAt: new Date().toISOString(),
                  intoPort: 22,
                  tunnel: {
                    instance: { exid: testInstanceExid },
                    from: { port: testPort },
                  },
                }),
              );

              const result = await getOneSsmSshTunnel(
                {
                  by: {
                    unique: {
                      instance: { exid: testInstanceExid },
                      from: { port: testPort },
                    },
                  },
                },
                context,
              );

              // alive pid, but the port never bound -> must report notconnected
              expect(result.status).toBe('CLOSED');
              expect(result.pid).toBeNull();
            } finally {
              // reap the decoy so it does not linger past the test
              try {
                process.kill(decoyPid, 'SIGKILL');
              } catch {
                // already gone
              }
            }
          },
        );
      },
    );
  });

  given('[case4] OPEN status requires SSM permissions', () => {
    when('[t0] attempt to open tunnel without valid instance', () => {
      then('throws error about instance not found', async () => {
        const { context } = scene;

        // this will fail because instance doesn't exist
        await expect(
          setSsmSshTunnel(
            DeclaredAwsSsmSshTunnel.as({
              instance: { exid: 'nonexistent-for-open-test' },
              from: { port: 22225 },
              into: { port: 22 },
              status: 'OPEN',
            }),
            context,
          ),
        ).rejects.toThrow(/instance not found|not found/);
      });
    });
  });
});
