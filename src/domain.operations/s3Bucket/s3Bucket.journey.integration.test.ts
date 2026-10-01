import {
  DeletePublicAccessBlockCommand,
  GetPublicAccessBlockCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getError } from 'helpful-errors';
import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import { getAwsClientConfig } from '@src/access/sdks/getAwsClientConfig';
import { DeclaredAwsS3Bucket } from '@src/domain.objects/DeclaredAwsS3Bucket';

import { delS3Bucket } from './delS3Bucket';
import { getOneS3Bucket } from './getOneS3Bucket';
import { setS3Bucket } from './setS3Bucket';

/**
 * .what = journey test for the s3 bucket lifecycle (findsert -> get -> findsert-again ->
 *   upsert lifecycle -> retract lifecycle -> upsert backup shape -> retract the RULE while
 *   the version state stays on -> del -> del-again) — the sdkS3 family's integration proof
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
    access: { public: 'blocked' },
    lifecycle: null,
    tags: { managedBy: 'declastruct', purpose: 'integration-test' },
  });

  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();

    // cleanup before: this run's own name, in case a retry re-enters the same describe
    //
    // ⚠️ this does NOT reap orphans from a prior crashed run. `testName` carries a fresh
    //    uuid per run, so a crashed run's bucket sits under a DIFFERENT name and no
    //    name-keyed delete can find it. a true orphan sweep must enumerate by the
    //    `purpose: integration-test` tag, as `vpc.journey` does via `getAllVpcs`.
    //
    // .why deferred = no `getAllS3Buckets` exists, and a tag sweep needs
    //    `s3:ListAllMyBuckets` — an action `demoPermissionsPolicy` does not grant
    //    (`s3:ListBucket` is the object-level peer, not this one). so the fix is a new
    //    domain op + a new sdk call + a new grant, and that grant lands in the same
    //    two-tree apply this stone is already halted on.
    //    ⇒ `.dream/v2026_09_21.feat.reap-orphan-test-buckets-by-tag.md`
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

    when(
      '[t3b] the public-access block is removed out-of-band — the ABSENT read',
      () => {
        then(
          'aws 404s, the read degrades to unblocked (never secure), and an upsert restores it',
          async () => {
            const { context } = scene;
            // the wish's named trap: a bucket with NO block. every other step declares
            // `'blocked'`, so only an out-of-band delete (a console user, another tool) reaches
            // this state. DeletePublicAccessBlock maps to the already-granted
            // s3:PutBucketPublicAccessBlock, so no new grant is owed
            const s3 = new S3Client(
              getAwsClientConfig({ region: context.aws.credentials.region }),
            );
            await s3.send(
              new DeletePublicAccessBlockCommand({ Bucket: testName }),
            );

            // A-5: measure the raw absent signal live — the one instrument the docs could not be.
            // getBucketPublicAccessBlock matches this name OR a 404, so pin both here
            const rawError = await getError(
              s3.send(new GetPublicAccessBlockCommand({ Bucket: testName })),
            );
            expect(rawError.name).toEqual(
              'NoSuchPublicAccessBlockConfiguration',
            );
            expect(
              (rawError as { $metadata?: { httpStatusCode?: number } })
                .$metadata?.httpStatusCode,
            ).toEqual(404);

            // I-8: absent reads as UNBLOCKED (all four false) — never as secure, so the plan
            // shows the exposure as an UPDATE rather than a false KEEP
            const absent = await getOneS3Bucket(
              { by: { unique: { name: testName } } },
              context,
            );
            expect(absent?.access.public).toEqual({
              acls: { block: false, ignore: false },
              policies: { block: false, restrict: false },
            });

            // the declared `'blocked'` converges it back, so later steps start from the same state
            await setS3Bucket({ upsert: testBucket }, context);
            const restored = await getOneS3Bucket(
              { by: { unique: { name: testName } } },
              context,
            );
            expect(restored?.access.public).toEqual({
              acls: { block: true, ignore: true },
              policies: { block: true, restrict: true },
            });
          },
        );
      },
    );

    when('[t4] upsert with a glacier staircase lifecycle', () => {
      then('reconciles the lifecycle config in place', async () => {
        const { context } = scene;
        const relifed = await setS3Bucket(
          {
            upsert: DeclaredAwsS3Bucket.as({
              name: testName,
              access: { public: 'blocked' },
              lifecycle: {
                objects: {
                  expire: null,
                  transitions: [
                    { afterDays: 30, class: 'GLACIER_IR' },
                    { afterDays: 180, class: 'DEEP_ARCHIVE' },
                  ],
                },
                versions: false,
                multiparts: { expire: null },
              },
              tags: { managedBy: 'declastruct', purpose: 'integration-test' },
            }),
          },
          context,
        );
        expect(relifed.lifecycle?.objects.transitions).toEqual([
          { afterDays: 30, class: 'GLACIER_IR' },
          { afterDays: 180, class: 'DEEP_ARCHIVE' },
        ]);

        // re-read from AWS to prove it converged (not just the return of the set)
        const reread = await getOneS3Bucket(
          { by: { unique: { name: testName } } },
          context,
        );
        expect(reread?.lifecycle?.objects.transitions).toEqual([
          { afterDays: 30, class: 'GLACIER_IR' },
          { afterDays: 180, class: 'DEEP_ARCHIVE' },
        ]);
      });
    });

    when('[t5] upsert back to `lifecycle: null` — the RETRACT path', () => {
      then(
        'deletes the rule and the bucket reads back with no lifecycle at all',
        async () => {
          const { context } = scene;
          // the `!desired.lifecycle` branch of setS3Bucket: delBucketLifecycle + poll-until-absent.
          // ⚠️ this step is only legal HERE — `versions` is still `false`, so the retract crosses no
          // one-way door. once [t6] turns the version state on, `lifecycle: null` would drop
          // `versions` to absent, which assertS3BucketVersionsNotRetracted rejects by design (I-1).
          const retracted = await setS3Bucket(
            {
              upsert: DeclaredAwsS3Bucket.as({
                name: testName,
                access: { public: 'blocked' },
                lifecycle: null,
                tags: { managedBy: 'declastruct', purpose: 'integration-test' },
              }),
            },
            context,
          );
          expect(retracted.lifecycle).toBeNull();

          // re-read from AWS to prove the DELETE converged, not just the return of the set
          const reread = await getOneS3Bucket(
            { by: { unique: { name: testName } } },
            context,
          );
          expect(reread?.lifecycle).toBeNull();
        },
      );
    });

    when(
      '[t6] upsert a backup-store shape — versions enabled + noncurrent expiry + multipart abort',
      () => {
        then(
          'reconciles the version-state + the two new lifecycle sub-rules (case=1)',
          async () => {
            const { context } = scene;
            // ⚠️ this bucket NEVER receives an object (case=7): a versioned bucket that holds objects
            // cannot be torn down — the demo role cannot delete object versions. the both-ends cleanup
            // stays clean only because no object is ever put here. this step also sends the
            // `Transitions: []` wire shape A-6 could not verify from the sdk — its live proof
            const backupShape = await setS3Bucket(
              {
                upsert: DeclaredAwsS3Bucket.as({
                  name: testName,
                  access: { public: 'blocked' },
                  lifecycle: {
                    objects: { expire: null, transitions: [] },
                    versions: {
                      status: 'enabled',
                      expire: { after: { days: 30 }, keep: null },
                    },
                    multiparts: { expire: { days: 7 } },
                  },
                  tags: {
                    managedBy: 'declastruct',
                    purpose: 'integration-test',
                  },
                }),
              },
              context,
            );
            expect(backupShape.lifecycle?.versions).toEqual({
              status: 'enabled',
              expire: { after: { days: 30 }, keep: null },
            });

            // re-read from AWS to prove the version-state + sub-rules converged (the SECOND plan = KEEP)
            const reread = await getOneS3Bucket(
              { by: { unique: { name: testName } } },
              context,
            );
            expect(reread?.lifecycle?.versions).toEqual({
              status: 'enabled',
              expire: { after: { days: 30 }, keep: null },
            });
            expect(reread?.lifecycle?.multiparts).toEqual({
              expire: { days: 7 },
            });
          },
        );
      },
    );

    when(
      '[t7] upsert a version-state-only lifecycle — the RULE is deleted, the version state is not',
      () => {
        then(
          'drops the lifecycle rule while `versions` stays enabled',
          async () => {
            const { context } = scene;
            // the `!hasAction` branch of setS3Bucket — the second, subtler delete path. this
            // lifecycle is ACTIONFUL (assertS3BucketLifecycleActionful keys on `versions !== false`,
            // so an enabled version state IS an action) yet carries no aws lifecycle-RULE action,
            // so the rule is deleted and the version-state put still runs.
            // ⇒ the pair [t5]/[t7] is what proves BOTH delBucketLifecycle call sites live
            const ruleless = await setS3Bucket(
              {
                upsert: DeclaredAwsS3Bucket.as({
                  name: testName,
                  access: { public: 'blocked' },
                  lifecycle: {
                    objects: { expire: null, transitions: [] },
                    versions: { status: 'enabled', expire: null },
                    multiparts: { expire: null },
                  },
                  tags: {
                    managedBy: 'declastruct',
                    purpose: 'integration-test',
                  },
                }),
              },
              context,
            );
            expect(ruleless.lifecycle?.versions).toEqual({
              status: 'enabled',
              expire: null,
            });

            // re-read: the rule's ACTIONS are gone, and the version state survived the delete
            const reread = await getOneS3Bucket(
              { by: { unique: { name: testName } } },
              context,
            );
            expect(reread?.lifecycle?.versions).toEqual({
              status: 'enabled',
              expire: null,
            });
            expect(reread?.lifecycle?.objects).toEqual({
              expire: null,
              transitions: [],
            });
            expect(reread?.lifecycle?.multiparts).toEqual({ expire: null });
          },
        );
      },
    );

    when('[t8] del bucket', () => {
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

    when('[t9] del again', () => {
      then('is a no-op (idempotent — an absent bucket converges)', async () => {
        const { context } = scene;
        await expect(
          delS3Bucket({ by: { unique: { name: testName } } }, context),
        ).resolves.toBeUndefined();
      });
    });
  });
});
