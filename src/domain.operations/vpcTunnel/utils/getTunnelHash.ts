import * as crypto from 'crypto';
import { type RefByUnique, serialize } from 'domain-objects';

import type { DeclaredAwsVpcTunnel } from '@src/domain.objects/DeclaredAwsVpcTunnel';

/**
 * .what = generates a deterministic hash for a tunnel configuration
 * .why = enables consistent identification of tunnels across process restarts
 * .note = includes account and region from input (part of unique ref)
 */
export const getTunnelHash = (input: {
  for: { tunnel: RefByUnique<typeof DeclaredAwsVpcTunnel> };
}): string => {
  // serialize the tunnel ref to create deterministic identity
  const serialized = serialize(
    // omit constructors
    JSON.parse(
      JSON.stringify({
        account: input.for.tunnel.account,
        region: input.for.tunnel.region,
        via: input.for.tunnel.via,
        into: input.for.tunnel.into,
        from: input.for.tunnel.from,
        _v: 'v2025_11_27',
      }),
    ),
  );

  return crypto
    .createHash('sha256')
    .update(serialized)
    .digest('hex')
    .slice(0, 16);
};
