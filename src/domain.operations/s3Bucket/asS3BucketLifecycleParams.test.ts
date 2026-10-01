import { getError, given, then, when } from 'test-fns';

import { DeclaredAwsS3BucketLifecycle } from '@src/domain.objects/DeclaredAwsS3BucketLifecycle';

import { asS3BucketLifecycleParams } from './asS3BucketLifecycleParams';

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

describe('asS3BucketLifecycleParams', () => {
  given('[case1] a lifecycle that declares every subject', () => {
    when('[t0] it is collapsed to wire params', () => {
      const params = asS3BucketLifecycleParams({
        lifecycle: asLifecycle({
          objectExpire: { days: 3650 },
          transitions: [{ afterDays: 30, class: 'GLACIER_IR' }],
          versions: {
            status: 'enabled',
            expire: { after: { days: 30 }, keep: 5 },
          },
          multipartExpire: { days: 7 },
        }),
      });

      then('each axis lands on its wire field', () => {
        expect(params.objectExpireDays).toEqual(3650);
        expect(params.transitions).toEqual([
          { afterDays: 30, class: 'GLACIER_IR' },
        ]);
        expect(params.versionExpiry).toEqual({ afterDays: 30, keep: 5 });
        expect(params.multipartExpireDays).toEqual(7);
      });
    });
  });

  given('[case2] a day-count the type admits but aws rejects', () => {
    when('[t0] the object expiry is fractional', () => {
      then('it throws loud (the F17 runtime check)', () => {
        const error = getError(() =>
          asS3BucketLifecycleParams({
            lifecycle: asLifecycle({ objectExpire: { days: 30.5 } }),
          }),
        );
        expect(error.message).toContain('objects.expire');
        expect(error.message).toContain('positive whole number of days');
        expect({ message: error.message }).toMatchSnapshot();
      });
    });

    when('[t1] the multipart expiry is zero', () => {
      then('it throws loud (aws requires a positive count)', () => {
        const error = getError(() =>
          asS3BucketLifecycleParams({
            lifecycle: asLifecycle({ multipartExpire: { days: 0 } }),
          }),
        );
        expect(error.message).toContain('multiparts.expire');
        expect(error.message).toContain('positive whole number of days');
        expect({ message: error.message }).toMatchSnapshot();
      });
    });
  });

  given('[case3] a keep count at and past the aws 1-100 bound', () => {
    const asKeep = (keep: number) =>
      asLifecycle({
        versions: { status: 'enabled', expire: { after: null, keep } },
      });

    when('[t0] keep is 0', () => {
      then('it throws loud (aws requires 1-100)', () => {
        const error = getError(() =>
          asS3BucketLifecycleParams({ lifecycle: asKeep(0) }),
        );
        expect(error.message).toContain('1-100');
        expect({ message: error.message }).toMatchSnapshot();
      });
    });

    when('[t1] keep is 101', () => {
      then('it throws loud (aws requires 1-100)', () => {
        const error = getError(() =>
          asS3BucketLifecycleParams({ lifecycle: asKeep(101) }),
        );
        expect(error.message).toContain('1-100');
        expect({ message: error.message }).toMatchSnapshot();
      });
    });

    when('[t2] keep is 1', () => {
      then('it passes (lower bound)', () => {
        const params = asS3BucketLifecycleParams({ lifecycle: asKeep(1) });
        expect(params.versionExpiry?.keep).toEqual(1);
      });
    });

    when('[t3] keep is 100', () => {
      then('it passes (upper bound)', () => {
        const params = asS3BucketLifecycleParams({ lifecycle: asKeep(100) });
        expect(params.versionExpiry?.keep).toEqual(100);
      });
    });
  });

  given('[case4] a version expiry with both axes null', () => {
    when('[t0] it is collapsed to wire params', () => {
      then('it throws loud (I-9: at least one axis required)', () => {
        const error = getError(() =>
          asS3BucketLifecycleParams({
            lifecycle: asLifecycle({
              versions: {
                status: 'enabled',
                expire: { after: null, keep: null } as any,
              },
            }),
          }),
        );
        expect(error.message).toContain('at least one axis');
        expect({ message: error.message }).toMatchSnapshot();
      });
    });
  });
});
