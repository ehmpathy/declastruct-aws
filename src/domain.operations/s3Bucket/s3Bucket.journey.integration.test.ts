import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import { DeclaredAwsS3Bucket } from '@src/domain.objects/DeclaredAwsS3Bucket';

import { delS3Bucket } from './delS3Bucket';
import { getOneS3Bucket } from './getOneS3Bucket';
import { setS3Bucket } from './setS3Bucket';

/**
 * .what = journey test for the s3 bucket lifecycle (findsert -> get -> findsert-again ->
 *   upsert lifecycle -> del -> del-again) — the sdkS3 family's integration proof
 * .why = validates the full plan/apply/idempotency contract against real S3. the bucket is
 *   the inbound mail store SES writes received messages into
 * .note
 *   - bucket names are GLOBALLY unique + lowercase; a uuid suffix keeps runs isolated
 *   - both-ends cleanup: delete before AND after so a crashed run self-heals (del is
 *     idempotent — a no-op if the bucket is absent), no scene-guard, no skip
 *   - aws requires an empty bucket to delete; this journey never puts objects, so del is clean
 */
describe('s3Bucket.journey', () => {
  const testName = `declastruct-test-s3-${genTestUuid().slice(0, 8)}`;

  const testBucket = DeclaredAwsS3Bucket.as({
    name: testName,
    lifecycle: null,
    tags: { managedBy: 'declastruct', purpose: 'integration-test' },
  });

  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();

    // cleanup before: remove any leftover from a prior crashed run
    await delS3Bucket({ by: { unique: { name: testName } } }, context);

    return { context };
  });

  afterAll(async () => {
    // cleanup after: fresh context so teardown runs even if scene setup failed
    const context = await getSampleAwsApiContext();
    await delS3Bucket({ by: { unique: { name: testName } } }, context);
  });

  given('[case1] s3 bucket lifecycle', () => {
    const createdBucket = useBeforeAll(async () => {
      const { context } = scene;
      return setS3Bucket({ findsert: testBucket }, context);
    });

    when('[t1] findsert bucket', () => {
      then('bucket is created with the declared name + tags', () => {
        expect(createdBucket.name).toBe(testName);
        expect(createdBucket.tags).toEqual({
          managedBy: 'declastruct',
          purpose: 'integration-test',
        });
      });
    });

    when('[t2] getOne by unique', () => {
      then('returns the bucket with its live tags', async () => {
        const { context } = scene;
        const found = await getOneS3Bucket(
          { by: { unique: { name: testName } } },
          context,
        );
        expect(found).not.toBeNull();
        expect(found?.name).toBe(testName);
        expect(found?.tags).toEqual({
          managedBy: 'declastruct',
          purpose: 'integration-test',
        });
      });
    });

    when('[t3] findsert again', () => {
      then('returns the extant bucket unchanged (idempotent)', async () => {
        const { context } = scene;
        const again = await setS3Bucket({ findsert: testBucket }, context);
        expect(again.name).toBe(testName);
      });
    });

    when('[t4] upsert with a glacier staircase lifecycle', () => {
      then('reconciles the lifecycle config in place', async () => {
        const { context } = scene;
        const relifed = await setS3Bucket(
          {
            upsert: DeclaredAwsS3Bucket.as({
              name: testName,
              lifecycle: {
                transitions: [
                  { afterDays: 30, class: 'GLACIER_IR' },
                  { afterDays: 180, class: 'DEEP_ARCHIVE' },
                ],
                expireAfterDays: null,
              },
              tags: { managedBy: 'declastruct', purpose: 'integration-test' },
            }),
          },
          context,
        );
        expect(relifed.lifecycle?.transitions).toEqual([
          { afterDays: 30, class: 'GLACIER_IR' },
          { afterDays: 180, class: 'DEEP_ARCHIVE' },
        ]);

        // re-read from AWS to prove it converged (not just the return of the set)
        const reread = await getOneS3Bucket(
          { by: { unique: { name: testName } } },
          context,
        );
        expect(reread?.lifecycle?.transitions).toEqual([
          { afterDays: 30, class: 'GLACIER_IR' },
          { afterDays: 180, class: 'DEEP_ARCHIVE' },
        ]);
      });
    });

    when('[t5] del bucket', () => {
      then('bucket is removed and getOne returns null', async () => {
        const { context } = scene;
        await delS3Bucket({ by: { unique: { name: testName } } }, context);
        const gone = await getOneS3Bucket(
          { by: { unique: { name: testName } } },
          context,
        );
        expect(gone).toBeNull();
      });
    });

    when('[t6] del again', () => {
      then('is a no-op (idempotent — an absent bucket converges)', async () => {
        const { context } = scene;
        await expect(
          delS3Bucket({ by: { unique: { name: testName } } }, context),
        ).resolves.toBeUndefined();
      });
    });
  });
});
