import { spawn } from 'child_process';
import { HasReadonly, refByUnique } from 'domain-objects';
import { createWriteStream } from 'fs';
import * as fs from 'fs/promises';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import * as path from 'path';
import type { ContextLogTrail } from 'simple-log-methods';

import { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsVpcTunnel } from '../../domain.objects/DeclaredAwsVpcTunnel';
import { getEc2Instance } from '../ec2Instance/getEc2Instance';
import { setEc2InstanceStatus } from '../ec2Instance/setEc2InstanceStatus';
import { getRdsCluster } from '../rdsCluster/getRdsCluster';
import { castIntoDeclaredAwsVpcTunnel } from './castIntoDeclaredAwsVpcTunnel';
import { TunnelCacheFile } from './utils/TunnelCacheFile';
import { getTunnelHash } from './utils/getTunnelHash';
import { isFilePresent } from './utils/isFilePresent';
import { isPortInUse } from './utils/isPortInUse';
import { isProcessAlive } from './utils/isProcessAlive';
import { isTunnelHealthy } from './utils/isTunnelHealthy';
import { killProcessOnPort } from './utils/killProcessOnPort';

/**
 * .what = opens or closes a VPC tunnel
 * .why = enables declarative control of SSM port-forwarding tunnels
 */
export const setVpcTunnel = async (
  input: DeclaredAwsVpcTunnel,
  context: ContextAwsApi & ContextLogTrail,
): Promise<HasReadonly<typeof DeclaredAwsVpcTunnel>> => {
  // resolve cache path from context
  const tunnelsDir = context.aws.cache.DeclaredAwsVpcTunnel.processes.dir;
  await fs.mkdir(tunnelsDir, { recursive: true });

  // compute tunnel identity and file paths
  const tunnelHash = getTunnelHash({ for: { tunnel: input } }, context);
  const cachePath = path.join(tunnelsDir, `${tunnelHash}.json`);
  const logPath = path.join(tunnelsDir, `${tunnelHash}.log`);

  // close tunnel if desired status is CLOSED
  if (input.status === 'CLOSED') {
    // check if cache file exists and kill process if alive
    const cacheFilePresent = await isFilePresent({ path: cachePath });
    if (cacheFilePresent) {
      const cacheContent = await fs.readFile(cachePath, 'utf-8');
      const cache: TunnelCacheFile = JSON.parse(cacheContent);
      if (isProcessAlive({ pid: cache.pid }))
        process.kill(cache.pid, 'SIGTERM');
    }

    // cleanup cache and log files
    await fs.rm(cachePath, { force: true });
    await fs.rm(logPath, { force: true });

    return castIntoDeclaredAwsVpcTunnel({
      unique: input,
      status: 'CLOSED',
      pid: null,
    });
  }

  // resolve bastion and cluster for OPEN status
  const bastion =
    (await getEc2Instance({ by: { unique: input.via.bastion } }, context)) ??
    BadRequestError.throw('bastion not found', { input });

  const cluster =
    (await getRdsCluster({ by: { unique: input.into.cluster } }, context)) ??
    BadRequestError.throw('cluster not found', { input });

  // failfast if cluster endpoint or port not available
  if (!cluster.host || !cluster.port)
    BadRequestError.throw('cluster endpoint or port not found', {
      input,
      cluster,
    });

  // check if port is already in use
  const portInUse = await isPortInUse({ port: input.from.port });

  // handle port in use scenario
  if (portInUse) {
    const cacheFilePresent = await isFilePresent({ path: cachePath });

    // port used by unknown process; kill it to reclaim
    if (!cacheFilePresent) {
      killProcessOnPort({ port: input.from.port });
    }

    // check if existing tunnel is ours and healthy
    if (cacheFilePresent) {
      const cacheContent = await fs.readFile(cachePath, 'utf-8');
      const cache: TunnelCacheFile = JSON.parse(cacheContent);

      // return early if existing tunnel is alive and healthy (idempotent)
      if (
        isProcessAlive({ pid: cache.pid }) &&
        (await isTunnelHealthy({ port: input.from.port }))
      )
        return castIntoDeclaredAwsVpcTunnel({
          unique: input,
          status: 'OPEN',
          pid: cache.pid,
        });

      // cleanup stale tunnel
      if (isProcessAlive({ pid: cache.pid }))
        process.kill(cache.pid, 'SIGTERM');
      await fs.rm(cachePath, { force: true });
    }
  }

  // start bastion if not running
  if (bastion.status !== 'running')
    await setEc2InstanceStatus(
      { by: { instance: input.via.bastion }, to: { status: 'running' } },
      context,
    );

  // create log file stream for tunnel output
  const logStream = createWriteStream(logPath, { flags: 'a' });
  logStream.write(
    `[${new Date().toISOString()}] starting tunnel to ${cluster.host.writer}:${
      cluster.port
    } via ${bastion.id}\n`,
  );

  // spawn SSM tunnel subprocess
  const tunnelProcess = spawn(
    'aws',
    [
      'ssm',
      'start-session',
      '--target',
      bastion.id,
      '--document-name',
      'AWS-StartPortForwardingSessionToRemoteHost',
      '--parameters',
      JSON.stringify({
        host: [cluster.host.writer],
        portNumber: [String(cluster.port)],
        localPortNumber: [String(input.from.port)],
      }),
      ...(context.aws.credentials.region
        ? ['--region', context.aws.credentials.region]
        : []),
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    },
  );

  // stream stdout and stderr to log file
  tunnelProcess.stdout?.pipe(logStream);
  tunnelProcess.stderr?.pipe(logStream);

  // detach so tunnel survives parent process exit
  tunnelProcess.unref();

  // failfast if pid is not assigned
  if (!tunnelProcess.pid)
    UnexpectedCodePathError.throw('tunnel process did not start', { input });

  // extract tunnel ref for cache (only unique keys, not mutable state)
  const tunnelRef = refByUnique<typeof DeclaredAwsVpcTunnel>(
    new DeclaredAwsVpcTunnel(input),
  );

  // persist cache file immediately so recovery is possible if process exits mid-startup
  const cacheData: TunnelCacheFile = {
    pid: tunnelProcess.pid,
    tunnel: tunnelRef,
  };
  await fs.writeFile(cachePath, JSON.stringify(cacheData, null, 2));

  // wait for tunnel to be ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () =>
        reject(
          new UnexpectedCodePathError('tunnel startup timeout', {
            input,
            logPath,
          }),
        ),
      300_000, // takes up to 2.5min every once in a while; that's a known "feature" w/ aws here
    );

    tunnelProcess.stdout?.on('data', (data: Buffer) => {
      if (data.toString().includes('Waiting for connections')) {
        clearTimeout(timeout);
        resolve();
      }
    });

    tunnelProcess.stderr?.on('data', (data: Buffer) => {
      context.log?.debug?.('tunnel stderr', { data: data.toString() });
    });

    tunnelProcess.on('error', (err) => {
      clearTimeout(timeout);
      reject(
        new UnexpectedCodePathError(`tunnel error: ${err.message}`, {
          input,
          logPath,
        }),
      );
    });

    tunnelProcess.on('exit', (code) => {
      if (code !== 0) {
        clearTimeout(timeout);
        reject(
          new UnexpectedCodePathError(`tunnel exited with code ${code}`, {
            input,
            logPath,
          }),
        );
      }
    });
  });

  // detach streams and remove listeners so parent process can exit while tunnel continues
  tunnelProcess.stdout?.unpipe(logStream);
  tunnelProcess.stderr?.unpipe(logStream);
  tunnelProcess.stdout?.removeAllListeners();
  tunnelProcess.stderr?.removeAllListeners();
  tunnelProcess.removeAllListeners();
  logStream.end();

  // unref streams so they don't keep parent alive, but don't destroy (would kill subprocess via SIGPIPE)
  (tunnelProcess.stdout as any)?.unref?.();
  (tunnelProcess.stderr as any)?.unref?.();
  tunnelProcess.unref();

  // verify tunnel is healthy (can reach database)
  const healthy = await isTunnelHealthy({ port: input.from.port });
  if (!healthy) {
    tunnelProcess.kill('SIGTERM');
    await fs.rm(cachePath, { force: true });
    UnexpectedCodePathError.throw('tunnel started but database not reachable', {
      input,
      logPath,
    });
  }

  return castIntoDeclaredAwsVpcTunnel({
    unique: input,
    status: 'OPEN',
    pid: tunnelProcess.pid,
  });
};
