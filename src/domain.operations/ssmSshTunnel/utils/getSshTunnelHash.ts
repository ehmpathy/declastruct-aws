import * as crypto from 'crypto';
import { type RefByUnique, serialize } from 'domain-objects';

import type { DeclaredAwsSsmSshTunnel } from '@src/domain.objects/DeclaredAwsSsmSshTunnel';

/**
 * .what = generates a deterministic hash for an SSH tunnel configuration
 * .why = enables consistent identification of tunnels across process restarts
 */
export const getSshTunnelHash = (input: {
  for: { tunnel: RefByUnique<typeof DeclaredAwsSsmSshTunnel> };
}): string => {
  // serialize the tunnel ref to create deterministic identity
  const serialized = serialize(
    // omit constructors
    JSON.parse(
      JSON.stringify({
        instance: input.for.tunnel.instance,
        fromPort: input.for.tunnel.from.port,
        _v: 'v2026_06_22',
      }),
    ),
  );

  return crypto
    .createHash('sha256')
    .update(serialized)
    .digest('hex')
    .slice(0, 16);
};
