import { given, then } from 'test-fns';

import { asAwsCostDateStamp } from './asAwsCostDateStamp';

describe('asAwsCostDateStamp', () => {
  given('[case1] a full iso timestamp', () => {
    then('it truncates to the YYYY-MM-DD calendar date', () => {
      expect(asAwsCostDateStamp({ stamp: '2026-07-01T00:00:00Z' })).toEqual(
        '2026-07-01',
      );
    });
  });

  given('[case2] a timestamp with milliseconds + offset', () => {
    then('it keeps only the first 10 chars', () => {
      expect(
        asAwsCostDateStamp({ stamp: '2026-12-31T23:59:59.999+05:00' }),
      ).toEqual('2026-12-31');
    });
  });

  given('[case3] a stamp already at date granularity', () => {
    then('it returns the date unchanged', () => {
      expect(asAwsCostDateStamp({ stamp: '2026-01-15' })).toEqual('2026-01-15');
    });
  });
});
