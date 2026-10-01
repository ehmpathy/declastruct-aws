import { HelpfulError } from 'helpful-errors';
import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import { awaitStableReads } from '@src/domain.operations/s3Bucket/awaitStableReads';

import { createBucket } from './createBucket';
import { delBucket } from './delBucket';
import { getBucketVersioning } from './getBucketVersioning';
import { putBucketVersioning } from './putBucketVersioning';

/**
 * .what = integration test for the version-state communicators, against real s3
 * .why = `getBucketVersioning` + `putBucketVersioning` are external contracts; this pins the raw
 *   shapes the cast relies on — the RAW status string on a read, and `null` on the empty body a
 *   never-versioned bucket returns, and on a bucket that does not exist
 * .note
 *   - both-ends cleanup on this run's uuid name; an empty versioned bucket deletes cleanly
 *   - reads poll via `awaitStableReads`, the same guard the prod path uses, since a get right
 *     after a put can still return the prior state
 */
describe('getBucketVersioning', () => {
  const name = `declastruct-test-sdkver-${genTestUuid().slice(0, 8)}`;

  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();
    await delBucket({ name }, context);
    await createBucket(
      { name, region: context.aws.credentials.region },
      context,
    );
    return { context };
  });

  afterAll(async () => {
    const context = await getSampleAwsApiContext();
    await delBucket({ name }, context);
  });

  // poll the read until it holds the expected status on two consecutive reads
  const readUntil = (expected: string | null) =>
    awaitStableReads({
      read: () => getBucketVersioning({ name }, scene.context),
      isStable: (status) => status === expected,
      stableReadsRequired: 2,
      deadlineMs: 30_000,
      onTimeout: (lastRead) =>
        new HelpfulError('version-state read did not settle', {
          name,
          expected,
          lastRead,
        }),
    });

  given('[case1] a bucket that was never versioned', () => {
    when('[t0] its version-state is read', () => {
      then('the empty body reads as null, never a status', async () => {
        const status = await getBucketVersioning({ name }, scene.context);
        expect(status).toEqual(null);
      });
    });
  });

  given('[case2] the version-state is put', () => {
    when('[t0] Enabled is put', () => {
      then('the read returns the raw string "Enabled"', async () => {
        await putBucketVersioning({ name, status: 'Enabled' }, scene.context);
        expect(await readUntil('Enabled')).toEqual('Enabled');
      });
    });

    when('[t1] Suspended is put on the versioned bucket', () => {
      then('the read returns the raw string "Suspended"', async () => {
        await putBucketVersioning({ name, status: 'Suspended' }, scene.context);
        expect(await readUntil('Suspended')).toEqual('Suspended');
      });
    });
  });

  given('[case3] a bucket that does not exist', () => {
    when('[t0] its version-state is read', () => {
      then('it reads as null, never throws', async () => {
        const status = await getBucketVersioning(
          { name: `${name}-absent` },
          scene.context,
        );
        expect(status).toEqual(null);
      });
    });
  });
});
