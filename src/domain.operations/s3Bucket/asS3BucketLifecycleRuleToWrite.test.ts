import { getError, given, then, when } from 'test-fns';

import { DeclaredAwsS3BucketLifecycle } from '@src/domain.objects/DeclaredAwsS3BucketLifecycle';

import { asS3BucketLifecycleRuleToWrite } from './asS3BucketLifecycleRuleToWrite';

const asLifecycle = (input: {
  objectExpire?: { days: number } | null;
  transitions?: {
    afterDays: number;
    class:
      | 'STANDARD_IA'
      | 'GLACIER_IR'
      | 'GLACIER'
      | 'DEEP_ARCHIVE'
      | 'INTELLIGENT_TIERING';
  }[];
  versions?: false | { status: 'enabled' | 'suspended'; expire?: unknown };
  multipartExpire?: { days: number } | null;
}): DeclaredAwsS3BucketLifecycle =>
  new DeclaredAwsS3BucketLifecycle({
    objects: {
      expire: input.objectExpire ?? null,
      transitions: input.transitions ?? [],
    },
    // biome-ignore lint/suspicious/noExplicitAny: test builder passes a valid union arm inline
    versions: (input.versions ?? false) as any,
    multiparts: { expire: input.multipartExpire ?? null },
  });

/**
 * .what = unit coverage for the one cast that decides PUT-vs-RETRACT for the lifecycle rule
 * .why = the cast exists to make THREE declaration shapes converge on ONE retract call site.
 *   that convergence is the whole claim, and it is only checkable here — from `setS3Bucket` the
 *   three shapes are indistinguishable once they have converged, which is the point
 */
describe('asS3BucketLifecycleRuleToWrite', () => {
  given(
    '[case1] the three declarations that mean "no rule on the bucket"',
    () => {
      when('[t0] the cast is run on each', () => {
        then(
          'a null lifecycle returns null — reason 1, the persist mode',
          () => {
            expect(asS3BucketLifecycleRuleToWrite({ lifecycle: null })).toEqual(
              null,
            );
          },
        );

        then('a version-state-only lifecycle returns null — reason 2', () => {
          // ⚠️ this is a VALID declaration, not a caller defect: its content is real, and it is
          // written by the version-state put rather than by a rule. so it must NOT throw — the
          // case=8 guard has to let it through, and only this assertion separates the two
          expect(
            asS3BucketLifecycleRuleToWrite({
              lifecycle: asLifecycle({ versions: { status: 'enabled' } }),
            }),
          ).toEqual(null);
        });

        then(
          'a suspended version-state-only lifecycle returns null too',
          () => {
            // the other arm of the status union reaches the same branch — an off-by-one on the
            // status check would pass the enabled case above and fail here
            expect(
              asS3BucketLifecycleRuleToWrite({
                lifecycle: asLifecycle({ versions: { status: 'suspended' } }),
              }),
            ).toEqual(null);
          },
        );
      });
    },
  );

  given('[case2] a lifecycle that carries a real rule action', () => {
    when('[t0] the cast is run on each single-action shape', () => {
      // each of the four actions ALONE must be enough to earn a PUT — a rule that checked only
      // one of them would pass a mixed fixture and silently retract the other three
      then('an object expiry alone earns a PUT', () => {
        const rule = asS3BucketLifecycleRuleToWrite({
          lifecycle: asLifecycle({ objectExpire: { days: 3650 } }),
        });
        expect(rule?.objectExpireDays).toEqual(3650);
      });

      then('a transition alone earns a PUT', () => {
        const rule = asS3BucketLifecycleRuleToWrite({
          lifecycle: asLifecycle({
            transitions: [{ afterDays: 30, class: 'GLACIER_IR' }],
          }),
        });
        expect(rule?.transitions).toEqual([
          { afterDays: 30, class: 'GLACIER_IR' },
        ]);
      });

      then('a multipart expiry alone earns a PUT', () => {
        const rule = asS3BucketLifecycleRuleToWrite({
          lifecycle: asLifecycle({ multipartExpire: { days: 7 } }),
        });
        expect(rule?.multipartExpireDays).toEqual(7);
      });

      then('a version EXPIRY earns a PUT, unlike a bare version-state', () => {
        // ⚠️ the sharpest pair in this file: `versions` with a status but no expiry retracts
        // (case1 above), while the SAME key with an expiry writes a rule. the expiry is a rule
        // action; the status is not. a check keyed on `versions` alone would confuse them
        const rule = asS3BucketLifecycleRuleToWrite({
          lifecycle: asLifecycle({
            versions: {
              status: 'enabled',
              expire: { after: { days: 30 }, keep: null },
            },
          }),
        });
        expect(rule?.versionExpiry).toEqual({ afterDays: 30, keep: null });
      });
    });
  });

  given('[case3] a fully-actionless lifecycle object', () => {
    when('[t0] the cast is run on it', () => {
      then('it throws and names `lifecycle: null` as the fix (case=8)', () => {
        // ⚠️ an empty lifecycle OBJECT is a caller defect, never a retract — the consumer who
        // wants no rule has an idiom already. this is the one shape that must throw rather than
        // return null, so it is what separates a defect from the three legitimate retracts
        const error = getError(() =>
          asS3BucketLifecycleRuleToWrite({ lifecycle: asLifecycle({}) }),
        );
        expect(error.message).toContain('lifecycle');
      });
    });
  });
});
