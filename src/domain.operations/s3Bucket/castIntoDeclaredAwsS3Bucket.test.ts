import { getError, given, then, when } from 'test-fns';

import { castIntoDeclaredAwsS3Bucket } from './castIntoDeclaredAwsS3Bucket';

const NO_BLOCK = null;
const ALL_BLOCKED = {
  blockPublicAcls: true,
  ignorePublicAcls: true,
  blockPublicPolicy: true,
  restrictPublicBuckets: true,
};

/**
 * .what = unit coverage for the raw s3 bucket reads → DeclaredAwsS3Bucket cast
 * .why = the canonicalizer that makes the SECOND plan read KEEP; pins the access + version-state +
 *   lifecycle collapses so a mis-cast fails a test instead of a false re-plan drift
 */
describe('castIntoDeclaredAwsS3Bucket', () => {
  given('[case1] a bucket with no block, no version-state, no rule', () => {
    when('[t0] the reads are cast', () => {
      const bucket = castIntoDeclaredAwsS3Bucket({
        name: 'my-bucket',
        publicAccessBlock: NO_BLOCK,
        versionStatus: null,
        lifecycle: null,
        tags: null,
      });

      then('it is a persist bucket — lifecycle null, tags null', () => {
        expect(bucket.name).toEqual('my-bucket');
        expect(bucket.lifecycle).toEqual(null);
        expect(bucket.tags).toEqual(null);
      });

      then('the absent block reads as unblocked, never secure (I-8)', () => {
        expect(bucket.access.public).toEqual({
          acls: { block: false, ignore: false },
          policies: { block: false, restrict: false },
        });
      });
    });
  });

  given('[case2] a bucket with an all-true block written', () => {
    when('[t0] the reads are cast', () => {
      const bucket = castIntoDeclaredAwsS3Bucket({
        name: 'my-bucket',
        publicAccessBlock: ALL_BLOCKED,
        versionStatus: null,
        lifecycle: null,
        tags: null,
      });

      then(
        "it reads back as the explicit object a declared 'blocked' canonicalizes to (case=1)",
        () => {
          // the two serialize-equal, so the plan reads KEEP
          expect(bucket.access.public).toEqual({
            acls: { block: true, ignore: true },
            policies: { block: true, restrict: true },
          });
        },
      );
    });
  });

  given(
    '[case3] a backup store — versioned, noncurrent expiry by age, multipart abort',
    () => {
      when('[t0] the reads are cast', () => {
        const bucket = castIntoDeclaredAwsS3Bucket({
          name: 'git-backup',
          publicAccessBlock: ALL_BLOCKED,
          versionStatus: 'Enabled',
          lifecycle: {
            transitions: [],
            objectExpireDays: null,
            versionExpiry: { afterDays: 30, keep: null },
            multipartExpireDays: 7,
          },
          tags: { managedBy: 'declastruct', purpose: 'git-backup' },
        });

        then('objects carry no expiry and no transitions', () => {
          expect(bucket.lifecycle?.objects).toEqual({
            expire: null,
            transitions: [],
          });
        });

        then('versions read enabled with the age arm of the expiry', () => {
          expect(bucket.lifecycle?.versions).toEqual({
            status: 'enabled',
            expire: { after: { days: 30 }, keep: null },
          });
        });

        then('multiparts read the abort window', () => {
          expect(bucket.lifecycle?.multiparts).toEqual({ expire: { days: 7 } });
        });
      });
    },
  );

  given('[case4] a keep-only version expiry', () => {
    when('[t0] the reads are cast', () => {
      const bucket = castIntoDeclaredAwsS3Bucket({
        name: 'git-backup',
        publicAccessBlock: ALL_BLOCKED,
        versionStatus: 'Enabled',
        lifecycle: {
          transitions: [],
          objectExpireDays: null,
          versionExpiry: { afterDays: null, keep: 5 },
          multipartExpireDays: null,
        },
        tags: null,
      });

      then('it reads back the count arm, with no age', () => {
        expect(bucket.lifecycle?.versions).toEqual({
          status: 'enabled',
          expire: { after: null, keep: 5 },
        });
      });
    });
  });

  given('[case5] a suspended version-state and no lifecycle rule', () => {
    when('[t0] the reads are cast', () => {
      const bucket = castIntoDeclaredAwsS3Bucket({
        name: 'my-bucket',
        publicAccessBlock: ALL_BLOCKED,
        versionStatus: 'Suspended',
        lifecycle: null,
        tags: null,
      });

      then('versions read suspended with no expiry', () => {
        expect(bucket.lifecycle?.versions).toEqual({
          status: 'suspended',
          expire: null,
        });
      });

      then('objects and multiparts read empty', () => {
        expect(bucket.lifecycle?.objects).toEqual({
          expire: null,
          transitions: [],
        });
        expect(bucket.lifecycle?.multiparts).toEqual({ expire: null });
      });
    });
  });

  given('[case6] a staircase rule and no version-state', () => {
    when('[t0] the reads are cast', () => {
      const bucket = castIntoDeclaredAwsS3Bucket({
        name: 'my-bucket',
        publicAccessBlock: ALL_BLOCKED,
        versionStatus: null,
        lifecycle: {
          transitions: [
            { afterDays: 30, class: 'GLACIER_IR' },
            { afterDays: 180, class: 'DEEP_ARCHIVE' },
          ],
          objectExpireDays: 3650,
          versionExpiry: null,
          multipartExpireDays: null,
        },
        tags: null,
      });

      then('versions read false', () => {
        expect(bucket.lifecycle?.versions).toEqual(false);
      });

      then('the staircase transitions and the object expiry round-trip', () => {
        expect(bucket.lifecycle?.objects.transitions).toEqual([
          { afterDays: 30, class: 'GLACIER_IR' },
          { afterDays: 180, class: 'DEEP_ARCHIVE' },
        ]);
        expect(bucket.lifecycle?.objects.expire).toEqual({ days: 3650 });
      });
    });
  });

  given(
    '[case7] an auto-tier rule — INTELLIGENT_TIERING at day 0, the third vision mode',
    () => {
      when('[t0] the reads are cast', () => {
        const bucket = castIntoDeclaredAwsS3Bucket({
          name: 'my-bucket',
          publicAccessBlock: ALL_BLOCKED,
          versionStatus: null,
          lifecycle: {
            transitions: [{ afterDays: 0, class: 'INTELLIGENT_TIERING' }],
            objectExpireDays: null,
            versionExpiry: null,
            multipartExpireDays: null,
          },
          tags: null,
        });

        then(
          'the day-0 transition round-trips onto objects, with no expiry',
          () => {
            expect(bucket.lifecycle?.objects).toEqual({
              expire: null,
              transitions: [{ afterDays: 0, class: 'INTELLIGENT_TIERING' }],
            });
          },
        );
      });
    },
  );

  given(
    '[case8] a transition to a storage class this package does not model',
    () => {
      when('[t0] the reads are cast', () => {
        const error = getError(() =>
          castIntoDeclaredAwsS3Bucket({
            name: 'my-bucket',
            publicAccessBlock: NO_BLOCK,
            versionStatus: null,
            lifecycle: {
              transitions: [{ afterDays: 30, class: 'ONEZONE_IA' }],
              objectExpireDays: null,
              versionExpiry: null,
              multipartExpireDays: null,
            },
            tags: null,
          }),
        );

        then(
          'it fails loud and names the bucket, field, value, modeled set, and fix (F8)',
          () => {
            expect(error.message).toContain('my-bucket');
            expect(error.message).toContain(
              'lifecycle.objects.transitions[].class',
            );
            expect(error.message).toContain('ONEZONE_IA');
            expect(error.message).toContain('GLACIER_IR');
            expect(error.message).toContain('fix:');
            expect({ message: error.message }).toMatchSnapshot();
          },
        );
      });
    },
  );

  given(
    '[case9] a version-state value this package does not model (I-5, case=4)',
    () => {
      when('[t0] the reads are cast', () => {
        // a future aws status must be DISTINGUISHABLE from a genuine absent read — the cast asserts
        // the raw string is modeled and throws otherwise, rather than false-KEEP a versioned bucket
        // as never-versioned
        const error = getError(() =>
          castIntoDeclaredAwsS3Bucket({
            name: 'my-bucket',
            publicAccessBlock: NO_BLOCK,
            versionStatus: 'MfaDelete',
            lifecycle: null,
            tags: null,
          }),
        );

        then(
          'it fails loud and names the bucket, field, value, modeled set, and fix (F8)',
          () => {
            expect(error.message).toContain('my-bucket');
            expect(error.message).toContain('versions.status');
            expect(error.message).toContain('MfaDelete');
            expect(error.message).toContain('Enabled, Suspended');
            expect(error.message).toContain('fix:');
            expect({ message: error.message }).toMatchSnapshot();
          },
        );
      });
    },
  );

  given(
    '[case10] a noncurrent-expiry rule on a bucket that was never versioned (I-7)',
    () => {
      when('[t0] the reads are cast', () => {
        // the two reads CONFLICT: a NoncurrentVersionExpiration rule exists but the version-state read
        // is absent. the cast cannot represent the pair, so it fails loud rather than drop the expiry
        // or synthesize a versions object
        const error = getError(() =>
          castIntoDeclaredAwsS3Bucket({
            name: 'my-bucket',
            publicAccessBlock: NO_BLOCK,
            versionStatus: null,
            lifecycle: {
              transitions: [],
              objectExpireDays: null,
              versionExpiry: { afterDays: 30, keep: null },
              multipartExpireDays: null,
            },
            tags: null,
          }),
        );

        then('it fails loud and names the bucket and the pair', () => {
          expect(error.message).toContain('bucket "my-bucket"');
          expect(error.message).toContain('never versioned');
        });

        then(
          'the fix names BOTH out-of-band exits, since no declaration can repair a read',
          () => {
            expect(error.message).toContain('fix:');
            expect(error.message).toContain(
              'put-bucket-versioning --bucket my-bucket',
            );
            expect(error.message).toContain(
              'delete-bucket-lifecycle --bucket my-bucket',
            );
            expect({ message: error.message }).toMatchSnapshot();
          },
        );
      });
    },
  );
});
