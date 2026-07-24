import { BadRequestError } from 'helpful-errors';
import { asIsoTimeStamp } from 'iso-time';
import { given, then } from 'test-fns';

import { assertCostReportRangeValid } from './assertCostReportRangeValid';

describe('assertCostReportRangeValid', () => {
  given('[case1] a range where until is after since', () => {
    then('it passes without a throw', () => {
      expect(() =>
        assertCostReportRangeValid({
          range: {
            since: asIsoTimeStamp('2026-07-01T00:00:00Z'),
            until: asIsoTimeStamp('2026-08-01T00:00:00Z'),
          },
        }),
      ).not.toThrow();
    });
  });

  given('[case2] a reversed range where until is before since', () => {
    then('it fails loud with a BadRequestError', () => {
      expect(() =>
        assertCostReportRangeValid({
          range: {
            since: asIsoTimeStamp('2026-08-01T00:00:00Z'),
            until: asIsoTimeStamp('2026-07-01T00:00:00Z'),
          },
        }),
      ).toThrow(BadRequestError);
    });

    then('the user-directed fail-loud message matches the snapshot', () => {
      expect(() =>
        assertCostReportRangeValid({
          range: {
            since: asIsoTimeStamp('2026-08-01T00:00:00Z'),
            until: asIsoTimeStamp('2026-07-01T00:00:00Z'),
          },
        }),
      ).toThrowErrorMatchingSnapshot();
    });
  });

  given('[case3] an empty range where until equals since', () => {
    then('it fails loud with a BadRequestError', () => {
      expect(() =>
        assertCostReportRangeValid({
          range: {
            since: asIsoTimeStamp('2026-07-01T00:00:00Z'),
            until: asIsoTimeStamp('2026-07-01T00:00:00Z'),
          },
        }),
      ).toThrow(BadRequestError);
    });

    then('the user-directed fail-loud message matches the snapshot', () => {
      expect(() =>
        assertCostReportRangeValid({
          range: {
            since: asIsoTimeStamp('2026-07-01T00:00:00Z'),
            until: asIsoTimeStamp('2026-07-01T00:00:00Z'),
          },
        }),
      ).toThrowErrorMatchingSnapshot();
    });
  });
});
