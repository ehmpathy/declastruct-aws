import { given, then, when } from 'test-fns';

import { asTunnelLogEntry } from './asTunnelLogEntry';

describe('asTunnelLogEntry', () => {
  given('a message', () => {
    when('timestamp is not provided', () => {
      const result = asTunnelLogEntry({ message: 'test message' });

      then('it includes the message', () => {
        expect(result).toContain('test message');
      });

      then('it includes a timestamp in brackets', () => {
        expect(result).toMatch(/^\[.+\] /);
      });

      then('it ends with newline', () => {
        expect(result).toMatch(/\n$/);
      });
    });

    when('timestamp is provided', () => {
      const fixedDate = new Date('2026-04-14T10:00:00.000Z');
      const result = asTunnelLogEntry({
        message: 'tunnel start',
        timestamp: fixedDate,
      });

      then('it uses the provided timestamp', () => {
        expect(result).toBe('[2026-04-14T10:00:00.000Z] tunnel start\n');
      });
    });
  });
});
