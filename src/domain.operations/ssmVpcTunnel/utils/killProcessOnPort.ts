import { execSync } from 'child_process';

/**
 * .what = kills any process listening on the specified port
 * .why = enables forceful reclaim of a port for tunnel use
 */
export const killProcessOnPort = (input: { port: number }): void => {
  // use lsof to find pid on port
  const result = execSync(`lsof -t -i:${input.port} || true`, {
    encoding: 'utf-8',
  });
  const pid = result.trim().split('\n')[0];

  // skip if no process found
  if (!pid) return;

  // kill the process
  process.kill(Number(pid), 'SIGTERM');
};
