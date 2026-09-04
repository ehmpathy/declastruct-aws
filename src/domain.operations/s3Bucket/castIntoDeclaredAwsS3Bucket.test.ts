import { getError } from 'test-fns';

import { castIntoDeclaredAwsS3Bucket } from './castIntoDeclaredAwsS3Bucket';

/**
 * .what = unit coverage for the raw s3 bucket → DeclaredAwsS3Bucket cast
 * .why = pure boundary transform; pins all three vision lifecycle modes (persist, explicit
 *   staircase, auto-tier) + tags, and the fail-loud on an unmodeled aws class, so a mis-cast
 *   lifecycle (the highest-risk field) fails a test instead of a false re-plan drift
 */
describe('castIntoDeclaredAwsS3Bucket', () => {
  test('null lifecycle + null tags → persist bucket', () => {
    const bucket = castIntoDeclaredAwsS3Bucket({
      name: 'my-bucket',
      lifecycle: null,
      tags: null,
    });
    expect(bucket.name).toEqual('my-bucket');
    expect(bucket.lifecycle).toEqual(null);
    expect(bucket.tags).toEqual(null);
  });

  test('glacier staircase lifecycle → transitions + expire', () => {
    const bucket = castIntoDeclaredAwsS3Bucket({
      name: 'my-bucket',
      lifecycle: {
        transitions: [
          { afterDays: 30, class: 'GLACIER_IR' },
          { afterDays: 180, class: 'DEEP_ARCHIVE' },
        ],
        expireAfterDays: 3650,
      },
      tags: { managedBy: 'declastruct', purpose: 'mail' },
    });
    expect(bucket.lifecycle?.transitions).toEqual([
      { afterDays: 30, class: 'GLACIER_IR' },
      { afterDays: 180, class: 'DEEP_ARCHIVE' },
    ]);
    expect(bucket.lifecycle?.expireAfterDays).toEqual(3650);
    expect(bucket.tags).toEqual({ managedBy: 'declastruct', purpose: 'mail' });
  });

  test('auto-tier lifecycle (INTELLIGENT_TIERING, day 0) → the third vision mode', () => {
    const bucket = castIntoDeclaredAwsS3Bucket({
      name: 'my-bucket',
      lifecycle: {
        transitions: [{ afterDays: 0, class: 'INTELLIGENT_TIERING' }],
        expireAfterDays: null,
      },
      tags: null,
    });
    expect(bucket.lifecycle?.transitions).toEqual([
      { afterDays: 0, class: 'INTELLIGENT_TIERING' },
    ]);
    expect(bucket.lifecycle?.expireAfterDays).toEqual(null);
  });

  test('an unmodeled aws storage class fails loud (no silent mistype)', () => {
    const error = getError(() =>
      castIntoDeclaredAwsS3Bucket({
        name: 'my-bucket',
        lifecycle: {
          transitions: [{ afterDays: 30, class: 'ONEZONE_IA' }],
          expireAfterDays: null,
        },
        tags: null,
      }),
    );
    expect(error).toBeDefined();
    expect(error.message).toContain('isDeclaredAwsS3StorageClass');
    expect(error.message).toMatchSnapshot();
  });
});
