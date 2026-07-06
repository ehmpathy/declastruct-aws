import { sleep } from '@ehmpathy/uni-time';
import { type ChildProcess, spawn } from 'child_process';
import { type HasReadonly, refByUnique } from 'domain-objects';
import { createWriteStream } from 'fs';
import * as fs from 'fs/promises';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import * as path from 'path';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsSsmSshTunnel } from '@src/domain.objects/DeclaredAwsSsmSshTunnel';
import { getEc2Instance } from '@src/domain.operations/ec2Instance/getEc2Instance';

import { asSsmSshTunnel } from './asSsmSshTunnel';
import { getSshTunnelHash } from './utils/getSshTunnelHash';
import { isFilePresent } from './utils/isFilePresent';
import { isProcessAlive } from './utils/isProcessAlive';
import { isSshTunnelHealthy } from './utils/isSshTunnelHealthy';
import type { SshTunnelCacheFile } from './utils/SshTunnelCacheFile';

/**
 * .what = opens or closes an SSH tunnel via SSM
 * .why = enables declarative control of SSM SSH port-forwarding tunnels
 */
export const setSsmSshTunnel = async (
  input: DeclaredAwsSsmSshTunnel,
  context: ContextAwsApi & ContextLogTrail,
): Promise<HasReadonly<typeof DeclaredAwsSsmSshTunnel>> => {
  // derive cache path from context
  const tunnelsDir =
    context.aws.cache.DeclaredAwsSsmSshTunnel?.processes?.dir ??
    '/tmp/declastruct/ssh-tunnels';
  await fs.mkdir(tunnelsDir, { recursive: true });

  // compute tunnel identity and file paths
  const tunnelHash = getSshTunnelHash({ for: { tunnel: input } });
  const cachePath = path.join(tunnelsDir, `${tunnelHash}.json`);
  const logPath = path.join(tunnelsDir, `${tunnelHash}.log`);

  // close tunnel if desired status is CLOSED
  if (input.status === 'CLOSED') {
    // check if cache file exists and kill process if alive
    const cacheFilePresent = await isFilePresent({ path: cachePath });
    if (cacheFilePresent) {
      const cacheContent = await fs.readFile(cachePath, 'utf-8');
      const cache: SshTunnelCacheFile = JSON.parse(cacheContent);
      if (isProcessAlive({ pid: cache.pid })) {
        // terminate the whole process group, not just the aws wrapper
        // note: the tunnel is spawned detached, so the session-manager-plugin
        //       child that actually holds the local port lives in its own group;
        //       a kill of only cache.pid would orphan it and leave the port open
        try {
          process.kill(-cache.pid, 'SIGTERM');
        } catch {
          // group signal can fail if the leader already exited; fall back to pid
          process.kill(cache.pid, 'SIGTERM');
        }
      }
    }

    // cleanup cache and log files
    await fs.rm(cachePath, { force: true });
    await fs.rm(logPath, { force: true });

    return asSsmSshTunnel({
      instanceExid: input.instance.exid,
      fromPort: input.from.port,
      intoPort: input.into.port,
      sessionHealth: { status: 'notconnected', pid: null, spawnedAt: null },
    });
  }

  // lookup instance for OPEN status
  const instance =
    (await getEc2Instance({ by: { unique: input.instance } }, context)) ??
    BadRequestError.throw('instance not found', { input });

  // check if extant tunnel is alive AND actually bound to the local port
  const cacheFilePresent = await isFilePresent({ path: cachePath });
  if (cacheFilePresent) {
    const cacheContent = await fs.readFile(cachePath, 'utf-8');
    const cache: SshTunnelCacheFile = JSON.parse(cacheContent);

    // return early only if the extant tunnel is alive AND its port accepts
    // connections (idempotent). pid-alive alone is not enough: a prior failed
    // startup can leave an alive-but-unbound process, which must be respawned.
    const cacheAlive = isProcessAlive({ pid: cache.pid });
    const cacheReady =
      cacheAlive && (await isSshTunnelHealthy({ port: input.from.port }));
    if (cacheAlive && cacheReady)
      return asSsmSshTunnel({
        instanceExid: input.instance.exid,
        fromPort: input.from.port,
        intoPort: input.into.port,
        sessionHealth: {
          status: 'connected',
          pid: cache.pid,
          spawnedAt: cache.spawnedAt,
        },
      });

    // stale/half-open — kill the process group if alive, then drop the cache
    if (cacheAlive) {
      try {
        process.kill(-cache.pid, 'SIGTERM');
      } catch {
        process.kill(cache.pid, 'SIGTERM');
      }
    }
    await fs.rm(cachePath, { force: true });
  }

  // build SSM command arguments for port forwarding
  const ssmArgs = [
    'ssm',
    'start-session',
    '--target',
    instance.id,
    '--document-name',
    'AWS-StartPortForwardingSession',
    '--parameters',
    JSON.stringify({
      portNumber: [String(input.into.port)],
      localPortNumber: [String(input.from.port)],
    }),
  ];

  // add region if specified
  if (context.aws.credentials.region) {
    ssmArgs.push('--region', context.aws.credentials.region);
  }

  // spawn the tunnel and wait for readiness, retrying through the SSM
  // agent-reconnect window. a freshly resumed box (or one whose NAT egress just
  // returned) is EC2-active before its SSM agent reports Online, so StartSession
  // fails with TargetNotConnected (exit 254) for a window; poll with backoff
  // rather than fail — mirrors the send-command retry in sdkSsm.execCommand.
  const maxAttempts = 18; // 18 * 10s = 3 min for the agent to come Online
  const backoffMs = 10_000;
  let tunnelProcess: ChildProcess | null = null;
  let spawnedAt = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // create a log file stream for this attempt's tunnel output
    const logStream = createWriteStream(logPath, { flags: 'a' });
    spawnedAt = new Date().toISOString();
    logStream.write(
      `[${spawnedAt}] tunnel start: ${instance.id}:${input.into.port} on local port ${input.from.port}\n`,
    );

    // spawn SSM tunnel subprocess (detached so it survives parent exit)
    const proc = spawn('aws', ssmArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });
    proc.stdout?.pipe(logStream);
    proc.stderr?.pipe(logStream);
    proc.unref();

    // failfast if pid is not assigned
    if (!proc.pid)
      UnexpectedCodePathError.throw('tunnel process did not start', { input });

    // wait for the ready banner, a retryable not-connected exit, or a failure
    const outcome = await new Promise<'ready' | 'notconnected'>(
      (done, fail) => {
        const timeout = setTimeout(
          () =>
            fail(
              new UnexpectedCodePathError('tunnel startup timeout', {
                input,
                logPath,
              }),
            ),
          120_000, // 2 minute timeout per attempt
        );

        // accumulate stderr so a not-connected error is told apart from a failure
        let stderrText = '';

        proc.stdout?.on('data', (data: Buffer) => {
          // only "Waiting for connections" means the local listener is bound.
          // the plugin prints "Starting session with SessionId" BEFORE it
          // connects (and even before a TargetNotConnected error), so a match on
          // that would settle ready prematurely — right past the retry window.
          if (data.toString().includes('Waiting for connections')) {
            clearTimeout(timeout);
            done('ready');
          }
        });

        proc.stderr?.on('data', (data: Buffer) => {
          stderrText += data.toString();
          context.log?.debug?.('tunnel stderr', { data: data.toString() });
        });

        proc.on('error', (err) => {
          clearTimeout(timeout);
          fail(
            new UnexpectedCodePathError(`tunnel error: ${err.message}`, {
              input,
              logPath,
            }),
          );
        });

        proc.on('exit', (code) => {
          if (code === 0) return;
          clearTimeout(timeout);
          // ssm agent not Online yet -> retryable
          if (stderrText.includes('TargetNotConnected')) {
            done('notconnected');
            return;
          }
          fail(
            new UnexpectedCodePathError(`tunnel exited with code ${code}`, {
              input,
              logPath,
            }),
          );
        });
      },
    );

    // ready -> keep this process, drop readiness listeners, stop the poll
    if (outcome === 'ready') {
      proc.stdout?.unpipe(logStream);
      proc.stderr?.unpipe(logStream);
      proc.stdout?.removeAllListeners();
      proc.stderr?.removeAllListeners();
      proc.removeAllListeners();
      logStream.end();
      tunnelProcess = proc;
      break;
    }

    // notconnected -> tear down this attempt, back off, and poll again
    proc.removeAllListeners();
    logStream.end();
    context.log?.debug?.('tunnel target not connected yet, poll again', {
      instanceId: instance.id,
      attempt,
    });
    if (attempt === maxAttempts)
      UnexpectedCodePathError.throw(
        'tunnel target never connected; ssm agent did not come Online',
        { input, logPath },
      );
    await sleep(backoffMs);
  }

  // failfast if the poll loop exited without a live process
  if (!tunnelProcess)
    UnexpectedCodePathError.throw('tunnel did not start after retries', {
      input,
      logPath,
    });

  // capture the pid (narrowed) for the cache + return
  const pid = tunnelProcess.pid;
  if (!pid)
    UnexpectedCodePathError.throw('tunnel process lacks a pid', { input });

  // extract tunnel ref for cache
  const tunnelRef = refByUnique<typeof DeclaredAwsSsmSshTunnel>(
    new DeclaredAwsSsmSshTunnel(input),
  );

  // persist cache file
  const cacheData: SshTunnelCacheFile = {
    pid,
    spawnedAt,
    intoPort: input.into.port,
    tunnel: tunnelRef,
  };
  await fs.writeFile(cachePath, JSON.stringify(cacheData, null, 2));

  // verify the local port actually accepts connections before we report connected
  // note: the session-manager-plugin prints its start banner before the local
  //       listener is fully bound, so probe the port to avoid a surprise where a
  //       freshly-opened tunnel refuses the first connection
  // note: on failure, tear down the process + cache so a half-open tunnel does
  //       not poison the next run's idempotency check (which reads this cache)
  try {
    await waitForSshTunnelHealthy({ port: input.from.port });
  } catch (error) {
    try {
      process.kill(-pid, 'SIGTERM');
    } catch {
      process.kill(pid, 'SIGTERM');
    }
    await fs.rm(cachePath, { force: true });
    throw error;
  }

  // unref streams
  (tunnelProcess.stdout as any)?.unref?.();
  (tunnelProcess.stderr as any)?.unref?.();
  tunnelProcess.unref();

  return asSsmSshTunnel({
    instanceExid: input.instance.exid,
    fromPort: input.from.port,
    intoPort: input.into.port,
    sessionHealth: {
      status: 'connected',
      pid,
      spawnedAt,
    },
  });
};

/**
 * .what = waits until a local tcp port accepts connections
 * .why = the tunnel banner appears before the listener is bound, so we probe
 *        the port to guarantee the tunnel is usable before we report connected
 */
const waitForSshTunnelHealthy = async (input: {
  port: number;
}): Promise<void> => {
  const maxAttempts = 30; // 30 * 500ms = 15s
  const delayMs = 500;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (await isSshTunnelHealthy({ port: input.port })) return;
    await sleep(delayMs);
  }

  throw new UnexpectedCodePathError(
    'tunnel local port did not accept connections within timeout',
    { port: input.port, maxAttempts, delayMs },
  );
};
