import { BadRequestError } from 'helpful-errors';
import { asIsoTimeStamp } from 'iso-time';
import { given, then } from 'test-fns';

import {
  assertResourceLevelRangeWithinRetention,
  RESOURCE_LEVEL_RETENTION_DAYS,
} from './assertResourceLevelRangeWithinRetention';

describe('assertResourceLevelRangeWithinRetention', () => {
  // a fixed "now" so the cutoff is deterministic
  const now = new Date('2026-07-20T00:00:00.000Z');

  given('[case1] a range that starts within the retention window', () => {
    then('it passes (no throw)', () => {
      expect(() =>
        assertResourceLevelRangeWithinRetention({
          range: {
            since: asIsoTimeStamp('2026-07-10T00:00:00.000Z'), // 10 days back
            until: asIsoTimeStamp('2026-07-20T00:00:00.000Z'),
          },
          now,
        }),
      ).not.toThrow();
    });
  });

  given('[case2] a range that starts before the retention window', () => {
    then('it fails loud with a BadRequestError that names the cap', () => {
      let caught: unknown;
      try {
        assertResourceLevelRangeWithinRetention({
          range: {
            since: asIsoTimeStamp('2026-06-01T00:00:00.000Z'), // ~49 days back
            until: asIsoTimeStamp('2026-07-20T00:00:00.000Z'),
          },
          now,
        });
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(BadRequestError);
      expect((caught as Error).message).toContain(
        String(RESOURCE_LEVEL_RETENTION_DAYS),
      );
    });
  });
});
