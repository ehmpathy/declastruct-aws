import type { HasReadonly, RefByUnique } from 'domain-objects';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSsmVpcTunnel } from '@src/domain.objects/DeclaredAwsSsmVpcTunnel';

import { castIntoDeclaredAwsSsmVpcTunnel } from './castIntoDeclaredAwsSsmVpcTunnel';
import { getVpcTunnelHash } from './utils/getVpcTunnelHash';
import { isFilePresent } from './utils/isFilePresent';
import { isProcessAlive } from './utils/isProcessAlive';
import { isVpcTunnelHealthy } from './utils/isVpcTunnelHealthy';
import type { VpcTunnelCacheFile } from './utils/VpcTunnelCacheFile';

/**
 * .what = gets current status of a VPC tunnel
 * .why = enables checking tunnel health before use and detecting stale tunnels
 */
export const getOneSsmVpcTunnel = async (
  input: {
    by: { unique: RefByUnique<typeof DeclaredAwsSsmVpcTunnel> };
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<HasReadonly<typeof DeclaredAwsSsmVpcTunnel>> => {
  // compute cache file path
  const hash = getVpcTunnelHash({ for: { tunnel: input.by.unique } });
  const cacheFilePath = path.join(
    context.aws.cache.DeclaredAwsSsmVpcTunnel.processes.dir,
    `${hash}.json`,
  );

  // check if cache file exists
  const cacheFileExists = await isFilePresent({ path: cacheFilePath });
  if (!cacheFileExists)
    return castIntoDeclaredAwsSsmVpcTunnel({
      unique: input.by.unique,
      status: 'CLOSED',
      pid: null,
    });

  // read cache file
  const cacheFileContent = await fs.readFile(cacheFilePath, 'utf-8');
  const cacheFile: VpcTunnelCacheFile = JSON.parse(cacheFileContent);

  // check if process is alive
  const processAlive = isProcessAlive({ pid: cacheFile.pid });
  if (!processAlive)
    return castIntoDeclaredAwsSsmVpcTunnel({
      unique: input.by.unique,
      status: 'CLOSED',
      pid: null,
    });

  // check if tunnel is healthy (port is responding)
  const tunnelHealthy = await isVpcTunnelHealthy({
    port: input.by.unique.from.port,
  });
  if (!tunnelHealthy)
    return castIntoDeclaredAwsSsmVpcTunnel({
      unique: input.by.unique,
      status: 'CLOSED',
      pid: null,
    });

  // tunnel is open and healthy
  return castIntoDeclaredAwsSsmVpcTunnel({
    unique: input.by.unique,
    status: 'OPEN',
    pid: cacheFile.pid,
  });
};
