import * as net from 'net';

/**
 * .what = checks if a local port is currently in use
 * .why = enables detection of existing tunnels or port conflicts
 */
export const isPortInUse = async (input: { port: number }): Promise<boolean> =>
  new Promise((resolve, reject) => {
    const server = net.createServer();

    // port in use is the expected "positive" case
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') return resolve(true);

      // any other error is unexpected; failfast
      reject(err);
    });

    // port is free if we can listen
    server.once('listening', () => {
      server.close();
      resolve(false);
    });

    server.listen(input.port, '127.0.0.1');
  });
