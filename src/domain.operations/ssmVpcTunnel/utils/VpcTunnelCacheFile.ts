import type { RefByUnique } from 'domain-objects';

import type { DeclaredAwsSsmVpcTunnel } from '@src/domain.objects/DeclaredAwsSsmVpcTunnel';

/**
 * .what = schema for tunnel cache file contents
 * .why = single file containing pid and tunnel reference (not mutable state)
 */
export interface VpcTunnelCacheFile {
  pid: number;
  tunnel: RefByUnique<typeof DeclaredAwsSsmVpcTunnel>;
}
