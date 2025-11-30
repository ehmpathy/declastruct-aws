import { HasReadonly, RefByUnique } from 'domain-objects';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ContextLogTrail } from 'simple-log-methods';

import { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsVpcTunnel } from '../../domain.objects/DeclaredAwsVpcTunnel';
import { castIntoDeclaredAwsVpcTunnel } from './castIntoDeclaredAwsVpcTunnel';
import { TunnelCacheFile } from './utils/TunnelCacheFile';
import { getTunnelHash } from './utils/getTunnelHash';
import { isFilePresent } from './utils/isFilePresent';
import { isProcessAlive } from './utils/isProcessAlive';
import { isTunnelHealthy } from './utils/isTunnelHealthy';

/**
 * .what = gets current status of a VPC tunnel
 * .why = enables checking tunnel health before use and detecting stale tunnels
 */
export const getVpcTunnel = async (
  input: {
    by: { unique: RefByUnique<typeof DeclaredAwsVpcTunnel> };
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<HasReadonly<typeof DeclaredAwsVpcTunnel>> => {
  // compute cache file path
  const hash = getTunnelHash({ for: { tunnel: input.by.unique } }, context);
  const cacheFilePath = path.join(
    context.aws.cache.DeclaredAwsVpcTunnel.processes.dir,
    `${hash}.json`,
  );

  // check if cache file exists
  const cacheFileExists = await isFilePresent({ path: cacheFilePath });
  if (!cacheFileExists)
    return castIntoDeclaredAwsVpcTunnel({
      unique: input.by.unique,
      status: 'CLOSED',
      pid: null,
    });

  // read cache file
  const cacheFileContent = await fs.readFile(cacheFilePath, 'utf-8');
  const cacheFile: TunnelCacheFile = JSON.parse(cacheFileContent);

  // check if process is alive
  const processAlive = isProcessAlive({ pid: cacheFile.pid });
  if (!processAlive)
    return castIntoDeclaredAwsVpcTunnel({
      unique: input.by.unique,
      status: 'CLOSED',
      pid: null,
    });

  // check if tunnel is healthy (port is responding)
  const tunnelHealthy = await isTunnelHealthy({
    port: input.by.unique.from.port,
  });
  if (!tunnelHealthy)
    return castIntoDeclaredAwsVpcTunnel({
      unique: input.by.unique,
      status: 'CLOSED',
      pid: null,
    });

  // tunnel is open and healthy
  return castIntoDeclaredAwsVpcTunnel({
    unique: input.by.unique,
    status: 'OPEN',
    pid: cacheFile.pid,
  });
};
