import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { assertS3BucketVersionKeepCountInBounds } from './assertS3BucketVersionKeepCountInBounds';

/**
 * .what = unit coverage for the `versions.expire.keep` bound guard
 * .why = the guard was extracted from an inline IIFE precisely so it could be exercised in
 *   ISOLATION. it is reached transitively through `asS3BucketLifecycleParams`, but that path
 *   only proves the guard fires on the WRITE — a `DeclaredAwsS3BucketVersionExpiry` built
 *   directly (a test fixture, a future read-path consumer) reaches the guard by no other route
 */
describe('assertS3BucketVersionKeepCountInBounds', () => {
  given('[case1] a keep count inside aws bounds', () => {
    when('[t0] the guard is run on each legal value', () => {
      then('it accepts both bounds and a midpoint', () => {
        // the bounds are INCLUSIVE on both ends — 1 and 100 are legal, and they are the two
        // values an off-by-one in the predicate would reject
        expect(() =>
          assertS3BucketVersionKeepCountInBounds({ keep: 1 }),
        ).not.toThrow();
        expect(() =>
          assertS3BucketVersionKeepCountInBounds({ keep: 50 }),
        ).not.toThrow();
        expect(() =>
          assertS3BucketVersionKeepCountInBounds({ keep: 100 }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] a keep count outside aws bounds', () => {
    when('[t0] the guard is run on each illegal value', () => {
      then('it rejects 0, 101, and a negative', () => {
        // 0 and 101 are the two just-outside values the inclusive bounds must exclude
        for (const keep of [0, 101, -1]) {
          const error = getError(() =>
            assertS3BucketVersionKeepCountInBounds({ keep }),
          );
          expect(error.message).toContain('1-100');
        }
      });

      then('the rejection names the fix, not only the symptom', () => {
        // F8: this wish's errors carry a named `fix` beside the rejected value — that is the
        // whole reason this is an `assert*` rather than an `is*` + `withAssure` trio, whose
        // rejection text emits only the check name and the value
        //
        // .note = `helpful-errors` serializes the metadata INTO `.message`, so the message is
        //   the surface to assert on. a `JSON.stringify(error)` would double-escape the quotes
        const error = getError(() =>
          assertS3BucketVersionKeepCountInBounds({ keep: 0 }),
        );
        expect(error.message).toContain(
          'declare `keep` as a whole number from 1 to 100',
        );
        expect(error.message).toContain('"keep": 0');
        expect({ message: error.message }).toMatchSnapshot();
      });
    });
  });

  given('[case3] a keep count that is not a whole number', () => {
    when('[t0] the guard is run on a fraction inside the numeric range', () => {
      then('it rejects it — inside the range is not enough', () => {
        // ⚠️ 2.5 sits BETWEEN the bounds, so a range-only check would accept it. aws takes a
        // whole count of versions, so the integer test is a distinct axis from the bounds
        const error = getError(() =>
          assertS3BucketVersionKeepCountInBounds({ keep: 2.5 }),
        );
        expect(error.message).toContain('whole number');
        expect({ message: error.message }).toMatchSnapshot();
      });
    });
  });
});
