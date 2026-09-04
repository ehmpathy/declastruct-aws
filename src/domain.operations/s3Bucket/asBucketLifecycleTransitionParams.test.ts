import { DeclaredAwsS3BucketLifecycleTransition } from '@src/domain.objects/DeclaredAwsS3BucketLifecycleTransition';

import { asBucketLifecycleTransitionParams } from './asBucketLifecycleTransitionParams';

/**
 * .what = unit coverage for the declared-transition -> putBucketLifecycle param cast
 * .why = the s3 communicator wants a plain `{ afterDays, class }[]`; this pins that the
 *   staircase order holds and each domain transition collapses to the flat shape
 */
describe('asBucketLifecycleTransitionParams', () => {
  test('casts a staircase in order, each transition flat', () => {
    const params = asBucketLifecycleTransitionParams({
      transitions: [
        new DeclaredAwsS3BucketLifecycleTransition({
          afterDays: 30,
          class: 'GLACIER_IR',
        }),
        new DeclaredAwsS3BucketLifecycleTransition({
          afterDays: 180,
          class: 'DEEP_ARCHIVE',
        }),
      ],
    });
    expect(params).toEqual([
      { afterDays: 30, class: 'GLACIER_IR' },
      { afterDays: 180, class: 'DEEP_ARCHIVE' },
    ]);
  });

  test('casts an empty schedule to an empty array', () => {
    expect(asBucketLifecycleTransitionParams({ transitions: [] })).toEqual([]);
  });
});
