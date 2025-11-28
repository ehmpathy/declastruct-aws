import { given, then, when } from 'test-fns';

import { isProcessAlive } from './isProcessAlive';

describe('isProcessAlive', () => {
  given('the current process pid', () => {
    when('checked', () => {
      let result: boolean;

      then('it should return true', () => {
        result = isProcessAlive({ pid: process.pid });
      });

      then('result should be true', () => {
        expect(result).toBe(true);
      });
    });
  });

  given('an invalid pid', () => {
    when('checked', () => {
      let result: boolean;

      then('it should return false', () => {
        result = isProcessAlive({ pid: 999999999 });
      });

      then('result should be false', () => {
        expect(result).toBe(false);
      });
    });
  });
});
