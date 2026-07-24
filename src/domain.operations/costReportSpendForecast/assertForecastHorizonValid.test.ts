import { BadRequestError } from 'helpful-errors';
import { asIsoTimeStamp } from 'iso-time';
import { given, then } from 'test-fns';

import { assertForecastHorizonValid } from './assertForecastHorizonValid';

describe('assertForecastHorizonValid', () => {
  given('[case1] a DAILY horizon within the 3-month cap', () => {
    then('it passes without a throw', () => {
      expect(() =>
        assertForecastHorizonValid({
          range: {
            since: asIsoTimeStamp('2026-07-01T00:00:00.000Z'),
            until: asIsoTimeStamp('2026-09-01T00:00:00.000Z'),
          },
          granularity: 'DAILY',
        }),
      ).not.toThrow();
    });
  });

  given('[case2] a MONTHLY horizon within the 18-month cap', () => {
    then('it passes without a throw', () => {
      expect(() =>
        assertForecastHorizonValid({
          range: {
            since: asIsoTimeStamp('2026-07-01T00:00:00.000Z'),
            until: asIsoTimeStamp('2027-12-01T00:00:00.000Z'),
          },
          granularity: 'MONTHLY',
        }),
      ).not.toThrow();
    });
  });

  given('[case3] a DAILY horizon beyond the 3-month cap', () => {
    then('it fails loud with a BadRequestError', () => {
      expect(() =>
        assertForecastHorizonValid({
          range: {
            since: asIsoTimeStamp('2026-07-01T00:00:00.000Z'),
            until: asIsoTimeStamp('2026-12-01T00:00:00.000Z'),
          },
          granularity: 'DAILY',
        }),
      ).toThrow(BadRequestError);
    });

    then('the user-directed fail-loud message matches the snapshot', () => {
      expect(() =>
        assertForecastHorizonValid({
          range: {
            since: asIsoTimeStamp('2026-07-01T00:00:00.000Z'),
            until: asIsoTimeStamp('2026-12-01T00:00:00.000Z'),
          },
          granularity: 'DAILY',
        }),
      ).toThrowErrorMatchingSnapshot();
    });
  });

  given('[case4] a MONTHLY horizon beyond the 18-month cap', () => {
    then('it fails loud with a BadRequestError', () => {
      expect(() =>
        assertForecastHorizonValid({
          range: {
            since: asIsoTimeStamp('2026-07-01T00:00:00.000Z'),
            until: asIsoTimeStamp('2028-07-01T00:00:00.000Z'),
          },
          granularity: 'MONTHLY',
        }),
      ).toThrow(BadRequestError);
    });

    then('the user-directed fail-loud message matches the snapshot', () => {
      expect(() =>
        assertForecastHorizonValid({
          range: {
            since: asIsoTimeStamp('2026-07-01T00:00:00.000Z'),
            until: asIsoTimeStamp('2028-07-01T00:00:00.000Z'),
          },
          granularity: 'MONTHLY',
        }),
      ).toThrowErrorMatchingSnapshot();
    });
  });
});
