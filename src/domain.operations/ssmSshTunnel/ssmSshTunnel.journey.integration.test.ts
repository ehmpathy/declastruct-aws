import {
  DescribeInstanceStatusCommand,
  DescribeInstancesCommand,
  EC2Client,
  TerminateInstancesCommand,
} from '@aws-sdk/client-ec2';
import {
  DescribeSessionsCommand,
  SSMClient,
  TerminateSessionCommand,
} from '@aws-sdk/client-ssm';
import { execFile } from 'child_process';
import * as fs from 'fs/promises';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';
import { promisify } from 'util';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import { DeclaredAwsEc2Instance } from '@src/domain.objects/DeclaredAwsEc2Instance';
import { DeclaredAwsEc2InstanceSession } from '@src/domain.objects/DeclaredAwsEc2InstanceSession';
import { DeclaredAwsEc2SshKeyAuthorized } from '@src/domain.objects/DeclaredAwsEc2SshKeyAuthorized';
import { DeclaredAwsSsmSshTunnel } from '@src/domain.objects/DeclaredAwsSsmSshTunnel';
import { getEc2Instance } from '@src/domain.operations/ec2Instance/getEc2Instance';
import { setEc2Instance } from '@src/domain.operations/ec2Instance/setEc2Instance';
import { setEc2InstanceSession } from '@src/domain.operations/ec2InstanceSession/setEc2InstanceSession';
import { setEc2SshKeyAuthorized } from '@src/domain.operations/ec2SshKeyAuthorized/setEc2SshKeyAuthorized';
import { execSsmCommand } from '@src/domain.operations/ssmCommand/execSsmCommand';

import { getOneSsmSshTunnel } from './getOneSsmSshTunnel';
import { setSsmSshTunnel } from './setSsmSshTunnel';

const execFileAsync = promisify(execFile);

/**
 * .what = exid of the declared NAT instance that fronts the private subnet
 * .why = the NAT + its 0.0.0.0/0 route are declared in resources.acceptance.ts
 *        and applied via declastruct; this test only ensures the NAT is active
 */
const NAT_INSTANCE_EXID = 'declastruct-acceptance-nat';

/**
 * .what = end-to-end journey test for SSH tunnel lifecycle
 * .why = proves we can open/close SSH tunnels and verify connectivity
 * .note
 *   - requires ssm:StartSession permission for tunnel creation
 *   - requires ssm:SendCommand permission for command execution
 *   - creates real EC2 instance (incurs charges)
 *   - uses unique local port to avoid conflicts
 */
/**
 * .what = projects a tunnel into a deterministic shape for a snapshot
 * .why = exid, from.port, pid, and spawnedAt are random per run; a raw snapshot
 *        of them makes every run after the first fail, so mask the volatile
 *        fields and retain the stable, reviewable ones (status, into.port)
 */
const asTunnelSnapshot = (tunnel: {
  status: string;
  into: { port: number };
  pid: number | null;
  spawnedAt: string | null;
}): Record<string, unknown> => ({
  status: tunnel.status,
  intoPort: tunnel.into.port,
  pid: tunnel.pid === null ? null : '[pid]',
  spawnedAt: tunnel.spawnedAt === null ? null : '[spawnedAt]',
});

/**
 * .what = generates an ephemeral ed25519 keypair in a temp dir
 * .why = gives the SSH proof a real private key to authenticate with and a
 *        paired public key to authorize on the instance
 */
const genEphemeralSshKeypair = async (input: {
  comment: string;
}): Promise<{ privateKeyPath: string; publicKey: string; dir: string }> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'declastruct-ssh-'));
  const privateKeyPath = path.join(dir, 'id_ed25519');
  await execFileAsync('ssh-keygen', [
    '-t',
    'ed25519',
    '-N',
    '',
    '-C',
    input.comment,
    '-f',
    privateKeyPath,
  ]);
  const publicKey = (
    await fs.readFile(`${privateKeyPath}.pub`, 'utf-8')
  ).trim();
  return { privateKeyPath, publicKey, dir };
};

/**
 * .what = terminates active SSM sessions whose target instance matches a predicate
 * .why = when an EC2 instance ends, the SSM port-forward session it held never
 *        cleanly disconnects, so the control plane leaves that session "Active"
 *        forever. the tunnel tests must terminate sessions explicitly — for their
 *        own run in afterAll (before the instance ends) and for orphans from prior
 *        crashed runs in beforeAll — the same both-ends discipline used for instances
 */
const terminateSsmSessions = async (input: {
  ssm: SSMClient;
  shouldTerminate: (target: string) => boolean;
}): Promise<void> => {
  const response = await input.ssm.send(
    new DescribeSessionsCommand({ State: 'Active' }),
  );
  const doomed = (response.Sessions ?? []).filter(
    (session) => session.Target && input.shouldTerminate(session.Target),
  );
  for (const session of doomed) {
    if (!session.SessionId) continue;
    await input.ssm.send(
      new TerminateSessionCommand({ SessionId: session.SessionId }),
    );
  }
};

/**
 * .what = runs a command on the instance over a real SSH session through the tunnel
 * .why = proves true SSH auth + login + exec, not merely a TCP connection
 */
const sshExec = async (input: {
  privateKeyPath: string;
  localPort: number;
  command: string;
}): Promise<{ stdout: string; stderr: string }> => {
  return execFileAsync('ssh', [
    '-i',
    input.privateKeyPath,
    '-p',
    String(input.localPort),
    '-o',
    'StrictHostKeyChecking=no',
    '-o',
    'UserKnownHostsFile=/dev/null',
    '-o',
    'BatchMode=yes',
    '-o',
    'ConnectTimeout=10',
    'ec2-user@127.0.0.1',
    input.command,
  ]);
};

describe('ssmSshTunnel.journey', () => {
  // extend timeout for EC2 lifecycle operations
  // note: the hibernate case alone is hibernate -> resume -> SSM agent recovery
  //       -> reopen tunnel, which on real hardware can approach 10 min; give
  //       generous headroom so a slow-but-valid run does not flake the timeout
  jest.setTimeout(900_000); // 15 minutes

  // track instance IDs for cleanup
  const instanceIds: string[] = [];

  // unique test cache dir
  const testCacheDir = `/tmp/declastruct-test-ssh-journey-${genTestUuid().slice(0, 8)}`;

  // unique local port for this test run (avoid conflicts with parallel tests)
  const localPort = 22000 + Math.floor(Math.random() * 1000);

  // cleanup BEFORE: terminate orphans from prior crashed runs
  beforeAll(async () => {
    const context = await getSampleAwsApiContext({ cacheDir: testCacheDir });
    const ec2 = new EC2Client({ region: context.aws.credentials.region });

    // find orphaned test instances by purpose tag
    const orphans = await ec2.send(
      new DescribeInstancesCommand({
        Filters: [
          { Name: 'tag:purpose', Values: ['ssh-journey-test'] },
          { Name: 'instance-state-name', Values: ['running', 'stopped'] },
        ],
      }),
    );

    const orphanIds =
      orphans.Reservations?.flatMap(
        (r) => r.Instances?.map((i) => i.InstanceId).filter(Boolean) ?? [],
      ) ?? [];

    if (orphanIds.length > 0) {
      await ec2.send(
        new TerminateInstancesCommand({ InstanceIds: orphanIds as string[] }),
      );
    }

    // prune orphan SSM sessions from prior crashed runs — sessions whose target
    // instance no longer exists (non-terminated). these never self-close, so an
    // instance-only sweep leaves them piling up "Active" forever
    const ssm = new SSMClient({ region: context.aws.credentials.region });
    const liveResponse = await ec2.send(
      new DescribeInstancesCommand({
        Filters: [
          {
            Name: 'instance-state-name',
            Values: ['running', 'pending', 'stopping', 'stopped'],
          },
        ],
      }),
    );
    const liveIds = new Set(
      liveResponse.Reservations?.flatMap(
        (r) => r.Instances?.map((i) => i.InstanceId).filter(Boolean) ?? [],
      ) ?? [],
    );
    await terminateSsmSessions({
      ssm,
      shouldTerminate: (target) => !liveIds.has(target),
    });

    // ensure cache dir exists
    await fs.mkdir(testCacheDir, { recursive: true });

    // ensure the declared NAT instance is active
    // note: the NAT instance + its 0.0.0.0/0 route are declared in
    //       resources.acceptance.ts and applied via declastruct; here we only
    //       ensure the NAT is active so the private subnet has egress
    const natFound = await getEc2Instance(
      { by: { unique: { exid: NAT_INSTANCE_EXID } } },
      context,
    );
    if (!natFound)
      throw new Error(
        'NAT instance not found — run declastruct apply first (resources.acceptance.ts)',
      );

    // start the NAT if not already active (idempotent; waits until active)
    await setEc2InstanceSession(
      {
        session: DeclaredAwsEc2InstanceSession.as({
          instance: { id: natFound.id },
          status: 'active',
        }),
      },
      context,
    );

    // wait for NAT status checks to pass (system + instance) so its user data
    // (iptables masquerade) has run before instances rely on egress
    for (let i = 0; i < 30; i++) {
      const statusResponse = await ec2.send(
        new DescribeInstanceStatusCommand({ InstanceIds: [natFound.id] }),
      );
      const status = statusResponse.InstanceStatuses?.[0];
      const systemOk = status?.SystemStatus?.Status === 'ok';
      const instanceOk = status?.InstanceStatus?.Status === 'ok';
      if (systemOk && instanceOk) break;
      await new Promise((done) => setTimeout(done, 5_000));
    }
  });

  // cleanup AFTER: terminate the test instance, remove cache
  // note: the NAT instance and its route are declared/permanent — leave them
  afterAll(async () => {
    const context = await getSampleAwsApiContext({ cacheDir: testCacheDir });
    const ec2 = new EC2Client({ region: context.aws.credentials.region });

    // terminate our SSM sessions BEFORE the instances — once an instance ends,
    // its held session can never cleanly disconnect and orphans forever
    const ssm = new SSMClient({ region: context.aws.credentials.region });
    const ourInstances = new Set(instanceIds);
    await terminateSsmSessions({
      ssm,
      shouldTerminate: (target) => ourInstances.has(target),
    });

    // terminate test instances
    if (instanceIds.length > 0) {
      await ec2.send(
        new TerminateInstancesCommand({ InstanceIds: instanceIds }),
      );
    }

    // cleanup cache dir
    await fs.rm(testCacheDir, { recursive: true, force: true });
  });

  // generate unique exid for this test run
  const testExid = `declastruct-test-ssh-journey-${genTestUuid().slice(0, 8)}`;

  // scene setup — create instance once for all tests
  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext({ cacheDir: testCacheDir });

    // create test instance with SSM agent (via launch template)
    const instance = await setEc2Instance(
      {
        findsert: DeclaredAwsEc2Instance.as({
          exid: testExid,
          template: { exid: 'declastruct-acceptance-template' },
          network: {
            subnet: { exid: 'declastruct-acceptance-subnet-private-1a' },
            security: { groups: [{ exid: 'declastruct-acceptance-sg' }] },
            interface: { publicIpEnabled: false, sourceDestChecked: true },
          },
          tags: { managedBy: 'declastruct', purpose: 'ssh-journey-test' },
        }),
      },
      context,
    );

    // track for cleanup
    if (!instanceIds.includes(instance.id)) instanceIds.push(instance.id);

    // ensure instance is active
    await setEc2InstanceSession(
      {
        session: DeclaredAwsEc2InstanceSession.as({
          instance: { id: instance.id },
          status: 'active',
        }),
      },
      context,
    );

    // wait for SSM agent to be active (via SSM command)
    // note: requires ssm:SendCommand permission
    let ssmReady = false;
    for (let i = 0; i < 30; i++) {
      try {
        const result = await execSsmCommand(
          {
            instance: { id: instance.id },
            commands: ['echo "ssm-agent-ready"'],
            timeoutSeconds: 30,
          },
          context,
        );
        if (
          result.status === 'Success' &&
          result.stdout.includes('ssm-agent-ready')
        ) {
          ssmReady = true;
          break;
        }
        // not yet successful; wait before retry
        await new Promise((done) => setTimeout(done, 10_000));
      } catch {
        // SSM agent not ready yet; wait and retry
        await new Promise((done) => setTimeout(done, 10_000));
      }
    }

    if (!ssmReady)
      throw new Error('SSM agent did not become ready within timeout');

    return { context, instance };
  });

  given('[case1] SSH tunnel open/close lifecycle', () => {
    when('[t0] tunnel is opened to instance', () => {
      then('tunnel opens with OPEN status and valid pid', async () => {
        const { context } = scene;

        const tunnel = await setSsmSshTunnel(
          DeclaredAwsSsmSshTunnel.as({
            instance: { exid: testExid },
            from: { port: localPort },
            into: { port: 22 },
            status: 'OPEN',
          }),
          context,
        );

        expect(tunnel.status).toBe('OPEN');
        expect(tunnel.pid).not.toBeNull();
        expect(typeof tunnel.pid).toBe('number');
        expect(tunnel.spawnedAt).not.toBeNull();
        expect(asTunnelSnapshot(tunnel)).toMatchSnapshot();
      });
    });

    when('[t1] getOneSsmSshTunnel is called', () => {
      then('reports OPEN status with valid pid', async () => {
        const { context } = scene;

        const tunnel = await getOneSsmSshTunnel(
          {
            by: {
              unique: {
                instance: { exid: testExid },
                from: { port: localPort },
              },
            },
          },
          context,
        );

        expect(tunnel.status).toBe('OPEN');
        expect(tunnel.pid).not.toBeNull();
        expect(asTunnelSnapshot(tunnel)).toMatchSnapshot();
      });
    });

    when('[t2] local port connectivity is tested', () => {
      then('local port accepts connections', async () => {
        const connectResult = await new Promise<{
          connected: boolean;
          error?: string;
        }>((done) => {
          const socket = new net.Socket();
          const timeout = setTimeout(() => {
            socket.destroy();
            done({ connected: false, error: 'timeout' });
          }, 5_000);

          socket.connect(localPort, '127.0.0.1', () => {
            clearTimeout(timeout);
            socket.destroy();
            done({ connected: true });
          });

          socket.on('error', (err) => {
            clearTimeout(timeout);
            socket.destroy();
            done({ connected: false, error: err.message });
          });
        });

        expect(connectResult.connected).toBe(true);
      });
    });

    when('[t3] tunnel is closed', () => {
      then('tunnel closes with CLOSED status and null pid', async () => {
        const { context } = scene;

        const tunnel = await setSsmSshTunnel(
          DeclaredAwsSsmSshTunnel.as({
            instance: { exid: testExid },
            from: { port: localPort },
            into: { port: 22 },
            status: 'CLOSED',
          }),
          context,
        );

        expect(tunnel.status).toBe('CLOSED');
        expect(tunnel.pid).toBeNull();
        expect(asTunnelSnapshot(tunnel)).toMatchSnapshot();
      });
    });

    when('[t4] getOneSsmSshTunnel is called after close', () => {
      then('reports CLOSED status', async () => {
        const { context } = scene;

        const tunnel = await getOneSsmSshTunnel(
          {
            by: {
              unique: {
                instance: { exid: testExid },
                from: { port: localPort },
              },
            },
          },
          context,
        );

        expect(tunnel.status).toBe('CLOSED');
        expect(tunnel.pid).toBeNull();
        expect(asTunnelSnapshot(tunnel)).toMatchSnapshot();
      });
    });

    when('[t5] local port connectivity is tested after close', () => {
      then('local port refuses connections', async () => {
        const connectResult = await new Promise<{
          connected: boolean;
          error?: string;
        }>((done) => {
          const socket = new net.Socket();
          const timeout = setTimeout(() => {
            socket.destroy();
            done({ connected: false, error: 'timeout' });
          }, 2_000);

          socket.connect(localPort, '127.0.0.1', () => {
            clearTimeout(timeout);
            socket.destroy();
            done({ connected: true });
          });

          socket.on('error', (err) => {
            clearTimeout(timeout);
            socket.destroy();
            done({ connected: false, error: err.message });
          });
        });

        expect(connectResult.connected).toBe(false);
      });
    });
  });

  given('[case2] SSH tunnel idempotency', () => {
    const idempotencyPort = localPort + 100;

    when('[t0] tunnel is opened twice', () => {
      then('both return OPEN with same pid (idempotent)', async () => {
        const { context } = scene;

        const firstOpen = await setSsmSshTunnel(
          DeclaredAwsSsmSshTunnel.as({
            instance: { exid: testExid },
            from: { port: idempotencyPort },
            into: { port: 22 },
            status: 'OPEN',
          }),
          context,
        );

        const secondOpen = await setSsmSshTunnel(
          DeclaredAwsSsmSshTunnel.as({
            instance: { exid: testExid },
            from: { port: idempotencyPort },
            into: { port: 22 },
            status: 'OPEN',
          }),
          context,
        );

        expect(firstOpen.status).toBe('OPEN');
        expect(secondOpen.status).toBe('OPEN');
        expect(firstOpen.pid).toBe(secondOpen.pid);
      });
    });

    when('[t1] cleanup: close the idempotency test tunnel', () => {
      then('tunnel closes', async () => {
        const { context } = scene;

        const result = await setSsmSshTunnel(
          DeclaredAwsSsmSshTunnel.as({
            instance: { exid: testExid },
            from: { port: idempotencyPort },
            into: { port: 22 },
            status: 'CLOSED',
          }),
          context,
        );

        expect(result.status).toBe('CLOSED');
      });
    });
  });

  given('[case3] SSH tunnel with hibernation', () => {
    const hibernationPort = localPort + 200;

    when('[t0] instance is hibernated and resumed', () => {
      then('tunnel can be reopened after resume', async () => {
        const { context, instance } = scene;

        // open tunnel
        const tunnelBefore = await setSsmSshTunnel(
          DeclaredAwsSsmSshTunnel.as({
            instance: { exid: testExid },
            from: { port: hibernationPort },
            into: { port: 22 },
            status: 'OPEN',
          }),
          context,
        );
        expect(tunnelBefore.status).toBe('OPEN');

        // close tunnel before hibernate
        await setSsmSshTunnel(
          DeclaredAwsSsmSshTunnel.as({
            instance: { exid: testExid },
            from: { port: hibernationPort },
            into: { port: 22 },
            status: 'CLOSED',
          }),
          context,
        );

        // hibernate instance
        await setEc2InstanceSession(
          {
            session: DeclaredAwsEc2InstanceSession.as({
              instance: { id: instance.id },
              status: 'hibernated',
            }),
          },
          context,
        );

        // resume instance
        await setEc2InstanceSession(
          {
            session: DeclaredAwsEc2InstanceSession.as({
              instance: { id: instance.id },
              status: 'active',
            }),
          },
          context,
        );

        // wait for SSM agent to be ready after resume
        for (let i = 0; i < 10; i++) {
          try {
            const result = await execSsmCommand(
              {
                instance: { id: instance.id },
                commands: ['echo "ssm-restored"'],
                timeoutSeconds: 30,
              },
              context,
            );
            if (result.status === 'Success') break;
          } catch {
            await new Promise((done) => setTimeout(done, 10_000));
          }
        }

        // reopen tunnel
        const tunnelAfter = await setSsmSshTunnel(
          DeclaredAwsSsmSshTunnel.as({
            instance: { exid: testExid },
            from: { port: hibernationPort + 1 },
            into: { port: 22 },
            status: 'OPEN',
          }),
          context,
        );

        expect(tunnelAfter.status).toBe('OPEN');

        // verify connectivity
        const connectResult = await new Promise<{ connected: boolean }>(
          (done) => {
            const socket = new net.Socket();
            const timeout = setTimeout(() => {
              socket.destroy();
              done({ connected: false });
            }, 5_000);

            socket.connect(hibernationPort + 1, '127.0.0.1', () => {
              clearTimeout(timeout);
              socket.destroy();
              done({ connected: true });
            });

            socket.on('error', () => {
              clearTimeout(timeout);
              socket.destroy();
              done({ connected: false });
            });
          },
        );

        expect(connectResult.connected).toBe(true);

        // cleanup
        await setSsmSshTunnel(
          DeclaredAwsSsmSshTunnel.as({
            instance: { exid: testExid },
            from: { port: hibernationPort + 1 },
            into: { port: 22 },
            status: 'CLOSED',
          }),
          context,
        );
      });
    });
  });

  given('[case4] real SSH auth + login + command execution', () => {
    const sshPort = localPort + 300;

    when('[t0] a key is authorized and we ssh in to run a command', () => {
      then('the command runs over SSH and returns its output', async () => {
        const { context } = scene;

        // generate an ephemeral keypair for this proof
        const comment = `journey-${genTestUuid().slice(0, 8)}`;
        const keypair = await genEphemeralSshKeypair({ comment });

        try {
          // open the SSH tunnel first (slow step) so the 60s Instance Connect
          // window opens only once we are ready to connect
          const tunnel = await setSsmSshTunnel(
            DeclaredAwsSsmSshTunnel.as({
              instance: { exid: testExid },
              from: { port: sshPort },
              into: { port: 22 },
              status: 'OPEN',
            }),
            context,
          );
          expect(tunnel.status).toBe('OPEN');

          // a unique token the remote echo must return verbatim
          const token = `declastruct-ssh-${genTestUuid()}`;

          // authorize the key on the box via Instance Connect, then ssh in and
          // run echo; the key is valid ~60s so re-authorize on each attempt
          let stdout = '';
          let lastError: unknown = null;
          for (let attempt = 1; attempt <= 5; attempt++) {
            await setEc2SshKeyAuthorized(
              DeclaredAwsEc2SshKeyAuthorized.as({
                instance: { exid: testExid },
                publicKey: keypair.publicKey,
                comment,
                user: 'ec2-user',
              }),
              context,
            );
            try {
              const result = await sshExec({
                privateKeyPath: keypair.privateKeyPath,
                localPort: sshPort,
                command: `echo ${token}`,
              });
              stdout = result.stdout;
              break;
            } catch (error) {
              lastError = error;
              await new Promise((done) => setTimeout(done, 5_000));
            }
          }

          // the echo output proves a fully authenticated SSH session executed
          if (!stdout)
            throw new Error(
              `ssh exec never succeeded: ${
                lastError instanceof Error
                  ? lastError.message
                  : String(lastError)
              }`,
            );
          expect(stdout.trim()).toBe(token);

          // cleanup the tunnel
          await setSsmSshTunnel(
            DeclaredAwsSsmSshTunnel.as({
              instance: { exid: testExid },
              from: { port: sshPort },
              into: { port: 22 },
              status: 'CLOSED',
            }),
            context,
          );
        } finally {
          await fs.rm(keypair.dir, { recursive: true, force: true });
        }
      });
    });
  });
});
