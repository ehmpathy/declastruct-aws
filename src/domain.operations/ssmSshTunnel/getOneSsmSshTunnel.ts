import type { HasReadonly, RefByUnique } from 'domain-objects';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSsmSshTunnel } from '@src/domain.objects/DeclaredAwsSsmSshTunnel';

import { asSsmSshTunnel } from './asSsmSshTunnel';
import { getSshTunnelHash } from './utils/getSshTunnelHash';
import { isFilePresent } from './utils/isFilePresent';
import { isProcessAlive } from './utils/isProcessAlive';
import { isSshTunnelHealthy } from './utils/isSshTunnelHealthy';
import type { SshTunnelCacheFile } from './utils/SshTunnelCacheFile';

/**
 * .what = gets current status of an SSH tunnel
 * .why = enables check tunnel health before use and detect stale tunnels
 */
export const getOneSsmSshTunnel = async (
  input: {
    by: { unique: RefByUnique<typeof DeclaredAwsSsmSshTunnel> };
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<HasReadonly<typeof DeclaredAwsSsmSshTunnel>> => {
  // compute cache file path
  const hash = getSshTunnelHash({ for: { tunnel: input.by.unique } });
  const cacheFilePath = path.join(
    context.aws.cache.DeclaredAwsSsmSshTunnel?.processes?.dir ??
      '/tmp/declastruct/ssh-tunnels',
    `${hash}.json`,
  );

  // check if cache file exists
  const cacheFileExists = await isFilePresent({ path: cacheFilePath });
  if (!cacheFileExists)
    return asSsmSshTunnel({
      instanceExid: input.by.unique.instance.exid,
      fromPort: input.by.unique.from.port,
      intoPort: 22, // default SSH port
      sessionHealth: { status: 'notconnected', pid: null, spawnedAt: null },
    });

  // read cache file
  const cacheFileContent = await fs.readFile(cacheFilePath, 'utf-8');
  const cacheFile: SshTunnelCacheFile = JSON.parse(cacheFileContent);

  // check if process is alive AND the local port actually accepts connections.
  // pid-alive alone is not enough: a prior failed startup can leave an alive but
  // unbound process in the cache, which would falsely read OPEN and block a
  // respawn. the port probe is the same signal ssh uses (matches the VPC
  // tunnel's isProcessAlive + isVpcTunnelHealthy pair).
  const processAlive = isProcessAlive({ pid: cacheFile.pid });
  const portReady = processAlive
    ? await isSshTunnelHealthy({ port: input.by.unique.from.port })
    : false;
  if (!processAlive || !portReady)
    return asSsmSshTunnel({
      instanceExid: input.by.unique.instance.exid,
      fromPort: input.by.unique.from.port,
      intoPort: cacheFile.intoPort,
      sessionHealth: { status: 'notconnected', pid: null, spawnedAt: null },
    });

  // tunnel is open
  return asSsmSshTunnel({
    instanceExid: input.by.unique.instance.exid,
    fromPort: input.by.unique.from.port,
    intoPort: cacheFile.intoPort,
    sessionHealth: {
      status: 'connected',
      pid: cacheFile.pid,
      spawnedAt: cacheFile.spawnedAt,
    },
  });
};
