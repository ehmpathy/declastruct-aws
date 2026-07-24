import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

import { getCostReportCache } from './getCostReportCache';

/**
 * .what = integration coverage for the on-disk cache adapter against a REAL temp dir
 * .why = getCostReportCache wraps simple-on-disk-cache; a unit test would have to mock
 *        the filesystem boundary (forbidden by rule.forbid.unit.remote-boundaries). this
 *        exercises the real adapter end-to-end via the `directory` seam, so the get/set/
 *        expiration passthrough is proven against actual disk, not a mock
 */
describe('getCostReportCache (integration)', () => {
  const dir = path.join(os.tmpdir(), `declastruct-cost-cache-${randomUUID()}`);

  afterAll(() => {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  });

  given('[case1] a cache built against a real temp dir', () => {
    when('a value is set then read back by the same key', () => {
      then('get returns the stored value from disk', async () => {
        const cache = getCostReportCache({
          directory: { local: { path: dir } },
          ttl: { hours: 1 },
        });
        const key = `key-${randomUUID()}`;

        // miss first — no value written yet
        expect(await cache.get(key)).toBeUndefined();

        // set then read back — the real on-disk store round-trips the value
        await cache.set(key, 'stored-value', { expiration: { hours: 1 } });
        expect(await cache.get(key)).toEqual('stored-value');
      });
    });

    when('set is called with no options', () => {
      then(
        'it forwards an undefined expiration and still persists',
        async () => {
          const cache = getCostReportCache({
            directory: { local: { path: dir } },
          });
          const key = `key-${randomUUID()}`;

          await cache.set(key, 'no-ttl-value');
          expect(await cache.get(key)).toEqual('no-ttl-value');
        },
      );
    });
  });
});
