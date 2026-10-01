import { given, then, when } from 'test-fns';

import type { S3BucketLifecycleParams } from '@src/domain.objects/S3BucketLifecycleParams';

import { doesS3BucketLifecycleReadMatchDesired } from './doesS3BucketLifecycleReadMatchDesired';

/**
 * .what = unit coverage for the lifecycle read-after-write match
 * .why = the set path polls until this returns true; a false-positive would declare convergence on
 *   a stale rule, and a false-negative would burn the poll to its deadline on a converged bucket
 */
describe('doesS3BucketLifecycleReadMatchDesired', () => {
  const desired: S3BucketLifecycleParams = {
    transitions: [{ afterDays: 30, class: 'GLACIER_IR' }],
    objectExpireDays: 3650,
    versionExpiry: { afterDays: 30, keep: 5 },
    multipartExpireDays: 7,
  };
  const staircase: S3BucketLifecycleParams = {
    ...desired,
    transitions: [
      { afterDays: 30, class: 'GLACIER_IR' },
      { afterDays: 180, class: 'DEEP_ARCHIVE' },
    ],
  };

  given('[case1] a live read identical to the desired rule', () => {
    when('[t0] the two are compared', () => {
      then('it matches', () => {
        expect(
          doesS3BucketLifecycleReadMatchDesired({ live: desired, desired }),
        ).toEqual(true);
      });
    });
  });

  given('[case2] a live read that is absent', () => {
    when('[t0] the two are compared', () => {
      then('it does not match', () => {
        expect(
          doesS3BucketLifecycleReadMatchDesired({ live: null, desired }),
        ).toEqual(false);
      });
    });
  });

  given('[case3] a live read that differs on exactly one axis', () => {
    when('[t0] only the keep axis differs', () => {
      then(
        'it does not match — a NoncurrentDays match alone is not enough',
        () => {
          expect(
            doesS3BucketLifecycleReadMatchDesired({
              live: { ...desired, versionExpiry: { afterDays: 30, keep: 9 } },
              desired,
            }),
          ).toEqual(false);
        },
      );
    });

    when('[t1] the transitions differ in content but match in count', () => {
      then('it does not match (F6 clamp)', () => {
        expect(
          doesS3BucketLifecycleReadMatchDesired({
            live: {
              ...desired,
              transitions: [{ afterDays: 45, class: 'GLACIER_IR' as const }],
            },
            desired,
          }),
        ).toEqual(false);
      });
    });

    when('[t2] only the object-expiry axis differs', () => {
      then('it does not match', () => {
        expect(
          doesS3BucketLifecycleReadMatchDesired({
            live: { ...desired, objectExpireDays: null },
            desired,
          }),
        ).toEqual(false);
      });
    });

    when('[t3] only the multipart axis differs', () => {
      then('it does not match', () => {
        expect(
          doesS3BucketLifecycleReadMatchDesired({
            live: { ...desired, multipartExpireDays: null },
            desired,
          }),
        ).toEqual(false);
      });
    });
  });

  given('[case4] a two-step staircase rule', () => {
    when('[t0] the live transitions arrive in reverse order', () => {
      then('it matches — the compare is a set, not positional', () => {
        // 🔴 the clamp on the set-compare. aws does not promise it replays the declared transition
        // order on read-back. a positional compare would never match here — so the poll would burn
        // to its 60s deadline and throw on a bucket that had converged
        expect(
          doesS3BucketLifecycleReadMatchDesired({
            live: {
              ...staircase,
              transitions: [...staircase.transitions].reverse(),
            },
            desired: staircase,
          }),
        ).toEqual(true);
      });
    });

    when('[t1] one transition is swapped for a peer at the same count', () => {
      then('it does not match — order-insensitive is not count-only', () => {
        // ⚠️ same length, same sorted-key arity, different content — the F6 defect at two
        // transitions rather than one
        expect(
          doesS3BucketLifecycleReadMatchDesired({
            live: {
              ...staircase,
              transitions: [
                { afterDays: 30, class: 'GLACIER_IR' },
                { afterDays: 365, class: 'DEEP_ARCHIVE' },
              ],
            },
            desired: staircase,
          }),
        ).toEqual(false);
      });
    });
  });
});
