import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { assertS3BucketLifecycleDaysInBounds } from './assertS3BucketLifecycleDaysInBounds';

describe('assertS3BucketLifecycleDaysInBounds', () => {
  given('[case1] a positive whole day-count', () => {
    when('[t0] the guard is run on each legal value', () => {
      then('it accepts the lower bound and a large count', () => {
        // 1 is the smallest count aws accepts; an off-by-one in the predicate rejects it
        expect(() =>
          assertS3BucketLifecycleDaysInBounds({
            field: 'objects.expire',
            duration: { days: 1 },
          }),
        ).not.toThrow();
        expect(() =>
          assertS3BucketLifecycleDaysInBounds({
            field: 'objects.expire',
            duration: { days: 3650 },
          }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] a day-count aws rejects', () => {
    when('[t0] the guard is run on zero, a negative, and a fraction', () => {
      then('it rejects each, and names the field', () => {
        for (const days of [0, -1, 30.5]) {
          const error = getError(() =>
            assertS3BucketLifecycleDaysInBounds({
              field: 'versions.expire.after',
              duration: { days },
            }),
          );
          expect(error.message).toContain('versions.expire.after');
          expect(error.message).toContain('positive whole number of days');
        }
      });

      then('the rejection names the fix, not only the symptom', () => {
        const error = getError(() =>
          assertS3BucketLifecycleDaysInBounds({
            field: 'multiparts.expire',
            duration: { days: 0 },
          }),
        );
        expect(error.message).toContain('"fix"');
        expect({ message: error.message }).toMatchSnapshot();
      });
    });
  });
});
