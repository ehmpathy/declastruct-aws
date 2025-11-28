import * as net from 'net';

/**
 * .what = checks if a tunnel is accepting connections
 * .why = verifies tunnel is functional beyond just port binding
 */
export const isTunnelHealthy = async (input: {
  port: number;
}): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(5000);

    // tunnel is healthy if we can connect
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });

    // any error means tunnel is not healthy
    socket.once('error', () => resolve(false));

    // timeout means tunnel is not responsive
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(input.port, '127.0.0.1');
  });
