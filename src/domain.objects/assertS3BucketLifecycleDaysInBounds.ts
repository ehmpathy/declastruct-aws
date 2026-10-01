import { BadRequestError } from 'helpful-errors';

import { isIsoDurationInDays } from './IsoDurationInDays';

/**
 * .what = rejects a lifecycle day-count that is not a positive whole number of days
 * .why = aws expires on whole days and requires a positive count. the declared `{ days: number }`
 *   admits `30.5` and `0`, so this is the one runtime check that type leaves open. it fails loud
 *   NEAR the field, names WHICH field, and names the fix (F8, F17)
 *
 * .note = the predicate stays `isIsoDurationInDays`. this is an `assert*` rather than its `.assure`
 *   for the same reason as `assertS3BucketVersionKeepCountInBounds`: `withAssure` emits only the
 *   check name and the value, and F8 ruled this wish's errors carry a named `fix`
 */
export const assertS3BucketLifecycleDaysInBounds = (input: {
  field: string;
  duration: { days: number };
}): void => {
  const { field, duration } = input;

  if (!isIsoDurationInDays.assess(duration))
    throw new BadRequestError(
      `${field} must be a positive whole number of days`,
      {
        field,
        duration,
        fix: `declare \`${field}\` as { days: N }, where N is a whole number of 1 or more`,
      },
    );
};
