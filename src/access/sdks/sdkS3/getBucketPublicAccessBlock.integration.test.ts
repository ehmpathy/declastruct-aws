import { DeletePublicAccessBlockCommand, S3Client } from '@aws-sdk/client-s3';
import { HelpfulError } from 'helpful-errors';
import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import type { S3BucketPublicAccessBlockParams } from '@src/domain.objects/S3BucketPublicAccessBlockParams';
import { awaitStableReads } from '@src/domain.operations/s3Bucket/awaitStableReads';

import { getAwsClientConfig } from '../getAwsClientConfig';
import { createBucket } from './createBucket';
import { delBucket } from './delBucket';
import { getBucketPublicAccessBlock } from './getBucketPublicAccessBlock';
import { putBucketPublicAccessBlock } from './putBucketPublicAccessBlock';

const ALL_TRUE: S3BucketPublicAccessBlockParams = {
  blockPublicAcls: true,
  ignorePublicAcls: true,
  blockPublicPolicy: true,
  restrictPublicBuckets: true,
};
const ALL_FALSE: S3BucketPublicAccessBlockParams = {
  blockPublicAcls: false,
  ignorePublicAcls: false,
  blockPublicPolicy: false,
  restrictPublicBuckets: false,
};

/**
 * .what = integration test for the public-access-block communicators, against real s3
 * .why = `getBucketPublicAccessBlock` + `putBucketPublicAccessBlock` are external contracts; this
 *   pins the four booleans round-trip, and that the ABSENT config (a 404) reads as `null` — never
 *   as all-false, and never as a thrown error that would abort a plan
 * .note
 *   - the absent state is arranged with a raw `DeletePublicAccessBlock`: no communicator deletes a
 *     block, and a declared `access.public` always writes four booleans, so the 404 exists only
 *     after an out-of-band removal. the read under test is what must degrade
 *   - both-ends cleanup on this run's uuid name; the bucket holds no objects
 */
describe('getBucketPublicAccessBlock', () => {
  const name = `declastruct-test-sdkpab-${genTestUuid().slice(0, 8)}`;

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

  // poll the read until it equals the expected value on two consecutive reads
  const readUntil = (expected: S3BucketPublicAccessBlockParams | null) =>
    awaitStableReads({
      read: () => getBucketPublicAccessBlock({ name }, scene.context),
      isStable: (value) => JSON.stringify(value) === JSON.stringify(expected),
      stableReadsRequired: 2,
      deadlineMs: 30_000,
      onTimeout: (lastRead) =>
        new HelpfulError('public-access-block read did not settle', {
          name,
          expected,
          lastRead,
        }),
    });

  given('[case1] the block is put', () => {
    when('[t0] all four are put false', () => {
      then('the read returns all four false', async () => {
        await putBucketPublicAccessBlock({ name, ...ALL_FALSE }, scene.context);
        const block = await readUntil(ALL_FALSE);
        expect(block).toEqual(ALL_FALSE);
        expect(block).toMatchSnapshot();
      });
    });

    when('[t1] all four are put true', () => {
      then('the read returns all four true', async () => {
        await putBucketPublicAccessBlock({ name, ...ALL_TRUE }, scene.context);
        const block = await readUntil(ALL_TRUE);
        expect(block).toEqual(ALL_TRUE);
        expect(block).toMatchSnapshot();
      });
    });
  });

  given('[case2] the block was removed out-of-band', () => {
    when('[t0] the read hits the absent config', () => {
      then('it returns null, never all-false and never a throw', async () => {
        const s3 = new S3Client(
          getAwsClientConfig({ region: scene.context.aws.credentials.region }),
        );
        await s3.send(new DeletePublicAccessBlockCommand({ Bucket: name }));
        expect(await readUntil(null)).toEqual(null);
      });
    });
  });

  given('[case3] a bucket that does not exist', () => {
    when('[t0] its block is read', () => {
      then('it reads as null, never throws', async () => {
        const block = await getBucketPublicAccessBlock(
          { name: `${name}-absent` },
          scene.context,
        );
        expect(block).toEqual(null);
      });
    });
  });
});
