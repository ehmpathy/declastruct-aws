import * as net from 'net';
import { given, then, when } from 'test-fns';

import { isTunnelHealthy } from './isTunnelHealthy';

describe('isTunnelHealthy', () => {
  given('a port with a listening server', () => {
    when('checked', () => {
      let result: boolean;
      let server: net.Server;

      then('it should return true', async () => {
        server = net.createServer();
        await new Promise<void>((resolve) => {
          server.listen(19997, '127.0.0.1', () => resolve());
        });
        result = await isTunnelHealthy({ port: 19997 });
        server.close();
      });

      then('result should be true', () => {
        expect(result).toBe(true);
      });
    });
  });

  given('a port with no listening server', () => {
    when('checked', () => {
      let result: boolean;

      then('it should return false', async () => {
        result = await isTunnelHealthy({ port: 19996 });
      });

      then('result should be false', () => {
        expect(result).toBe(false);
      });
    });
  });
});
