import * as net from 'net';
import { given, then, when } from 'test-fns';

import { isPortInUse } from './isPortInUse';

describe('isPortInUse', () => {
  given('a port that is in use', () => {
    when('checked', () => {
      let result: boolean;
      let server: net.Server;

      then('it should return true', async () => {
        server = net.createServer();
        await new Promise<void>((resolve) => {
          server.listen(19999, '127.0.0.1', () => resolve());
        });
        result = await isPortInUse({ port: 19999 });
        server.close();
      });

      then('result should be true', () => {
        expect(result).toBe(true);
      });
    });
  });

  given('a port that is free', () => {
    when('checked', () => {
      let result: boolean;

      then('it should return false', async () => {
        result = await isPortInUse({ port: 19998 });
      });

      then('result should be false', () => {
        expect(result).toBe(false);
      });
    });
  });
});
