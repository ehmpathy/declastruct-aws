import { BadRequestError } from 'helpful-errors';
import { asIsoTimeStamp } from 'iso-time';
import { given, then } from 'test-fns';

import { assertForecastStartFuture } from './assertForecastStartFuture';

describe('assertForecastStartFuture', () => {
  const now = '2026-07-16T12:00:00.000Z';

  given('[case1] a start on today', () => {
    then('it passes without a throw', () => {
      expect(() =>
        assertForecastStartFuture({
          range: {
            since: asIsoTimeStamp('2026-07-16T00:00:00.000Z'),
            until: asIsoTimeStamp('2026-08-01T00:00:00.000Z'),
          },
          now,
        }),
      ).not.toThrow();
    });
  });

  given('[case2] a start after today', () => {
    then('it passes without a throw', () => {
      expect(() =>
        assertForecastStartFuture({
          range: {
            since: asIsoTimeStamp('2026-07-20T00:00:00.000Z'),
            until: asIsoTimeStamp('2026-08-01T00:00:00.000Z'),
          },
          now,
        }),
      ).not.toThrow();
    });
  });

  given('[case3] a start before today', () => {
    then('it fails loud with a BadRequestError', () => {
      expect(() =>
        assertForecastStartFuture({
          range: {
            since: asIsoTimeStamp('2026-07-15T00:00:00.000Z'),
            until: asIsoTimeStamp('2026-08-01T00:00:00.000Z'),
          },
          now,
        }),
      ).toThrow(BadRequestError);
    });

    then('the user-directed fail-loud message matches the snapshot', () => {
      expect(() =>
        assertForecastStartFuture({
          range: {
            since: asIsoTimeStamp('2026-07-15T00:00:00.000Z'),
            until: asIsoTimeStamp('2026-08-01T00:00:00.000Z'),
          },
          now,
        }),
      ).toThrowErrorMatchingSnapshot();
    });
  });
});
