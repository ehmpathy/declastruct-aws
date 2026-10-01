import { getError, given, then, when } from 'test-fns';

import { assertS3BucketLifecycleActionful } from './assertS3BucketLifecycleActionful';
import { DeclaredAwsS3BucketLifecycle } from './DeclaredAwsS3BucketLifecycle';

/**
 * .what = unit coverage for the case=8 / I-6 actionless-lifecycle guard
 * .why = a lifecycle that declares nothing on any subject is a rule that does nothing; aws rejects it
 *   deep in the api. this guard fails loud NEAR the field and names `lifecycle: null` — its reject
 *   path is the behavior that owes a clamp (rule.require.clamp-edge-cases)
 */
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
  versions?: false | { status: 'enabled' | 'suspended' };
  multipartExpire?: { days: number } | null;
}): DeclaredAwsS3BucketLifecycle =>
  new DeclaredAwsS3BucketLifecycle({
    objects: {
      expire: input.objectExpire ?? null,
      transitions: input.transitions ?? [],
    },
    versions:
      input.versions === undefined
        ? false
        : input.versions === false
          ? false
          : { status: input.versions.status, expire: null },
    multiparts: { expire: input.multipartExpire ?? null },
  });

describe('assertS3BucketLifecycleActionful', () => {
  given('[case1] a lifecycle that declares no action on any subject', () => {
    when('[t0] it is asserted', () => {
      then('it throws loud and names lifecycle: null', () => {
        const error = getError(() =>
          assertS3BucketLifecycleActionful({
            lifecycle: asLifecycle({}),
          }),
        );
        expect(error.message).toContain('no action on any subject');
        expect({ message: error.message }).toMatchSnapshot();
      });
    });
  });

  given('[case2] a lifecycle with exactly one action', () => {
    when('[t0] the one action is an object expiry', () => {
      then('it is actionful (no throw)', () => {
        expect(() =>
          assertS3BucketLifecycleActionful({
            lifecycle: asLifecycle({ objectExpire: { days: 30 } }),
          }),
        ).not.toThrow();
      });
    });

    when('[t1] the one action is a version-state', () => {
      then('it is actionful — versions on IS an action (no throw)', () => {
        expect(() =>
          assertS3BucketLifecycleActionful({
            lifecycle: asLifecycle({ versions: { status: 'enabled' } }),
          }),
        ).not.toThrow();
      });
    });

    when('[t2] the one action is a multipart abort', () => {
      then('it is actionful (no throw)', () => {
        expect(() =>
          assertS3BucketLifecycleActionful({
            lifecycle: asLifecycle({ multipartExpire: { days: 7 } }),
          }),
        ).not.toThrow();
      });
    });

    when('[t3] the one action is a transition', () => {
      then('it is actionful (no throw)', () => {
        expect(() =>
          assertS3BucketLifecycleActionful({
            lifecycle: asLifecycle({
              transitions: [{ afterDays: 30, class: 'GLACIER_IR' }],
            }),
          }),
        ).not.toThrow();
      });
    });
  });
});
