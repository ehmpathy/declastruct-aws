import { getError, given, then, when } from 'test-fns';

import { DeclaredAwsS3Bucket } from '@src/domain.objects/DeclaredAwsS3Bucket';

import { assertS3BucketVersionsNotRetracted } from './assertS3BucketVersionsNotRetracted';

/**
 * .what = unit coverage for the I-1 un-version retract guard (case=3)
 * .why = a bucket's version-state is aws's one IRREVERSIBLE property; a retract to `versions: false`
 *   against a live versioned bucket would silently no-op into a permadrift. this guard fails loud
 *   before any write — its reject path is the behavior that owes a clamp (rule.require.clamp-edge-cases)
 */
const asBucket = (input: {
  versions: false | { status: 'enabled' | 'suspended' };
}): DeclaredAwsS3Bucket =>
  DeclaredAwsS3Bucket.as({
    name: 'my-bucket',
    access: { public: 'blocked' },
    lifecycle: {
      objects: { expire: null, transitions: [] },
      versions:
        input.versions === false
          ? false
          : { status: input.versions.status, expire: null },
      multiparts: { expire: null },
    },
    tags: null,
  });

describe('assertS3BucketVersionsNotRetracted', () => {
  given('[case1] a live Enabled bucket', () => {
    const found = asBucket({ versions: { status: 'enabled' } });

    when('[t0] the wish declares versions:false', () => {
      then('it throws loud — a one-way door, named by bucket', () => {
        const error = getError(() =>
          assertS3BucketVersionsNotRetracted({
            desired: asBucket({ versions: false }),
            found,
          }),
        );
        expect(error.message).toContain('one-way door');
        expect(error.message).toContain('bucket "my-bucket"');
        expect({ message: error.message }).toMatchSnapshot();
      });
    });

    when('[t1] the wish declares lifecycle:null', () => {
      then('it throws loud — the null-lifecycle retract path', () => {
        const desired = DeclaredAwsS3Bucket.as({
          name: 'my-bucket',
          access: { public: 'blocked' },
          lifecycle: null,
          tags: null,
        });
        const error = getError(() =>
          assertS3BucketVersionsNotRetracted({ desired, found }),
        );
        expect(error.message).toContain('one-way door');
        expect(error.message).toContain('bucket "my-bucket"');
        expect({ message: error.message }).toMatchSnapshot();
      });
    });

    when('[t2] the wish declares suspended', () => {
      then('it does NOT throw — the legal retract', () => {
        expect(() =>
          assertS3BucketVersionsNotRetracted({
            desired: asBucket({ versions: { status: 'suspended' } }),
            found,
          }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] a live Suspended bucket', () => {
    when('[t0] the wish declares versions:false', () => {
      then('it throws loud — suspended is still versioned', () => {
        const error = getError(() =>
          assertS3BucketVersionsNotRetracted({
            desired: asBucket({ versions: false }),
            found: asBucket({ versions: { status: 'suspended' } }),
          }),
        );
        expect(error.message).toContain('one-way door');
        expect({ message: error.message }).toMatchSnapshot();
      });
    });
  });

  given('[case3] no live version-state to retract', () => {
    when('[t0] the bucket is absent (a create)', () => {
      then('it never throws', () => {
        expect(() =>
          assertS3BucketVersionsNotRetracted({
            desired: asBucket({ versions: false }),
            found: null,
          }),
        ).not.toThrow();
      });
    });

    when('[t1] the live bucket was never versioned', () => {
      then('versions:false does NOT throw', () => {
        expect(() =>
          assertS3BucketVersionsNotRetracted({
            desired: asBucket({ versions: false }),
            found: asBucket({ versions: false }),
          }),
        ).not.toThrow();
      });
    });
  });
});
