import type { RefByUnique } from 'domain-objects';

import type { DeclaredAwsVpcTunnel } from '../../../domain.objects/DeclaredAwsVpcTunnel';

/**
 * .what = schema for tunnel cache file contents
 * .why = single file containing pid and tunnel reference (not mutable state)
 */
export interface TunnelCacheFile {
  pid: number;
  tunnel: RefByUnique<typeof DeclaredAwsVpcTunnel>;
}
