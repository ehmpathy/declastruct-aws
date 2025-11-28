import * as crypto from 'crypto';
import { RefByUnique, serialize } from 'domain-objects';

import { DeclaredAwsVpcTunnel } from '../../../domain.objects/DeclaredAwsVpcTunnel';

/**
 * .what = generates a deterministic hash for a tunnel configuration
 * .why = enables consistent identification of tunnels across process restarts
 */
export const getTunnelHash = (input: {
  for: { tunnel: RefByUnique<typeof DeclaredAwsVpcTunnel> };
}): string => {
  // serialize the tunnel ref to create deterministic identity
  const serialized = serialize(
    // omit constructors
    JSON.parse(
      JSON.stringify({
        via: input.for.tunnel.via,
        into: input.for.tunnel.into,
        from: input.for.tunnel.from,
      }),
    ),
  );

  return crypto
    .createHash('sha256')
    .update(serialized)
    .digest('hex')
    .slice(0, 16);
};
