import type { DeclaredAwsSsmSshTunnel } from '@src/domain.objects/DeclaredAwsSsmSshTunnel';

/**
 * .what = derives active state from SSH tunnel record
 * .why = encapsulates state derivation for testability and idempotency checks
 */
export const asSsmSshTunnelState = (input: {
  tunnel: DeclaredAwsSsmSshTunnel | null;
}): 'OPEN' | 'CLOSED' => {
  // if no tunnel exists, it's closed
  if (!input.tunnel) return 'CLOSED';

  // return the tunnel's status
  return input.tunnel.status;
};
