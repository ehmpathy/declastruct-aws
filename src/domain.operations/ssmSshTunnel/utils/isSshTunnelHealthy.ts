import * as net from 'net';

/**
 * .what = checks whether a local tcp port accepts a connection right now
 * .why = pid-alive alone does not prove the tunnel is usable — a spawned
 *        session-manager-plugin can be alive yet never bind the local listener
 *        (e.g. a prior failed startup). a connect probe is the same signal ssh
 *        itself uses, so it is the honest health check for tunnel state.
 */
export const isSshTunnelHealthy = async (input: {
  port: number;
}): Promise<boolean> =>
  new Promise((done) => {
    const socket = new net.Socket();
    const settle = (ready: boolean) => {
      socket.destroy();
      done(ready);
    };
    socket.setTimeout(1_000);
    socket.once('connect', () => settle(true));
    socket.once('timeout', () => settle(false));
    socket.once('error', () => settle(false));
    socket.connect(input.port, '127.0.0.1');
  });
