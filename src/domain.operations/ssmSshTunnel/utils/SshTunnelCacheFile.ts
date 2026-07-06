import type { RefByUnique } from 'domain-objects';

import type { DeclaredAwsSsmSshTunnel } from '@src/domain.objects/DeclaredAwsSsmSshTunnel';

/**
 * .what = schema for SSH tunnel cache file contents
 * .why = single file with pid, spawn time, and tunnel reference
 */
export interface SshTunnelCacheFile {
  pid: number;
  spawnedAt: string;
  intoPort: number;
  tunnel: RefByUnique<typeof DeclaredAwsSsmSshTunnel>;
}
