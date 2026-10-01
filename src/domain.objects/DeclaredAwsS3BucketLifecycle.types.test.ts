import { given, then, when } from 'test-fns';

import type { DeclaredAwsS3Bucket } from './DeclaredAwsS3Bucket';
import type { DeclaredAwsS3BucketLifecycle } from './DeclaredAwsS3BucketLifecycle';
import type {
  DeclaredAwsS3BucketLifecycleVersions,
  VersionExpiry,
} from './DeclaredAwsS3BucketLifecycleVersions';

/**
 * .what = compile-time coverage for the pits of success the vision places at the TYPE level
 * .why = these guarantees have no runtime behavior to observe — they are enforced by `tsc`. each
 *   `@ts-expect-error` below is the assertion: if the type ever loosens, the directive goes unused
 *   and `npm run test:types` fails. the runtime `expect`s only keep jest from a hollow pass
 *
 * .note
 *   - case=11 [t0]: `versions: { status: 'enabled' }` without `expire` does not compile
 *   - case=11 [t1]: `expire: null` (keep every version) stays legal (I-3)
 *   - F18 / I-9: the all-null `VersionExpiry` arm is untypeable
 *   - case=2 [t0] / case=11 [t5]: a bucket that omits `access` or `lifecycle` does not compile (A-1)
 */
describe('DeclaredAwsS3BucketLifecycle (types)', () => {
  given('[case1] a versions declaration', () => {
    when('[t0] `expire` is omitted', () => {
      then('the compiler refuses it (case=11 [t0])', () => {
        // @ts-expect-error — `expire` is required; "versions on, expiry forgotten" cannot be typed
        const versions: DeclaredAwsS3BucketLifecycleVersions = {
          status: 'enabled',
        };
        expect(versions.status).toEqual('enabled');
      });
    });

    when('[t1] `expire: null` is declared', () => {
      then(
        'it compiles — keep-all-versions stays legal (case=11 [t1], I-3)',
        () => {
          const versions: DeclaredAwsS3BucketLifecycleVersions = {
            status: 'enabled',
            expire: null,
          };
          expect(versions.expire).toBeNull();
        },
      );
    });
  });

  given('[case2] a version expiry', () => {
    when('[t0] both axes are null', () => {
      then('the compiler refuses it (F18, I-9)', () => {
        // @ts-expect-error — an expiry rule with no axis set is untypeable
        const expire: VersionExpiry = { after: null, keep: null };
        expect(expire.keep).toBeNull();
      });
    });

    when('[t1] only the count axis is set', () => {
      then('it compiles', () => {
        const expire: VersionExpiry = { after: null, keep: 5 };
        expect(expire.keep).toEqual(5);
      });
    });

    when('[t2] only the age axis is set', () => {
      then('it compiles', () => {
        const expire: VersionExpiry = { after: { days: 30 }, keep: null };
        expect(expire.after).toEqual({ days: 30 });
      });
    });
  });

  given('[case3] a lifecycle declaration', () => {
    when('[t0] `versions` is omitted', () => {
      then('the compiler refuses it — `false` must be said aloud', () => {
        // @ts-expect-error — versions is required; the never-versioned choice is `false`, never absent
        const lifecycle: DeclaredAwsS3BucketLifecycle = {
          objects: { expire: null, transitions: [] },
          multiparts: { expire: null },
        };
        expect(lifecycle.multiparts.expire).toBeNull();
      });
    });
  });

  given('[case4] a bucket declaration', () => {
    when('[t0] `access` is omitted', () => {
      then('the compiler refuses it (case=2 [t0], A-1)', () => {
        // @ts-expect-error — access is required; an upgrade must add it
        const bucket: Pick<DeclaredAwsS3Bucket, 'name' | 'access'> = {
          name: 'declastruct-demo',
        };
        expect(bucket.name).toEqual('declastruct-demo');
      });
    });

    when('[t1] `lifecycle` is omitted', () => {
      then('the compiler refuses it (case=11 [t5], A-1)', () => {
        // @ts-expect-error — lifecycle is required-nullable; omission is not a choice
        const bucket: Pick<DeclaredAwsS3Bucket, 'name' | 'lifecycle'> = {
          name: 'declastruct-demo',
        };
        expect(bucket.name).toEqual('declastruct-demo');
      });
    });
  });
});
