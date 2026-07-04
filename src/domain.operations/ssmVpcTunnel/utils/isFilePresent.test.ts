import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

import { isFilePresent } from './isFilePresent';

describe('isFilePresent', () => {
  given('a file that exists', () => {
    when('checked', () => {
      let result: boolean;
      let testPath: string;

      then('it should return true', async () => {
        testPath = path.join(os.tmpdir(), `test-file-${Date.now()}`);
        await fs.writeFile(testPath, 'test');
        result = await isFilePresent({ path: testPath });
        await fs.unlink(testPath);
      });

      then('result should be true', () => {
        expect(result).toBe(true);
      });
    });
  });

  given('a file that does not exist', () => {
    when('checked', () => {
      let result: boolean;

      then('it should return false', async () => {
        result = await isFilePresent({ path: '/tmp/nonexistent-file-12345' });
      });

      then('result should be false', () => {
        expect(result).toBe(false);
      });
    });
  });
});
