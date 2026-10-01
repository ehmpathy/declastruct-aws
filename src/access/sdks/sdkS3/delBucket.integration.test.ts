import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { BadRequestError, getError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';
import { createBucket } from './createBucket';
import { delBucket } from './delBucket';
import { headBucket } from './headBucket';

const KEY = 'fixture.txt';

/**
 * .what = removes the fixture object, then the bucket — both idempotent against an absent bucket
 * .why = both-ends cleanup; aws refuses DeleteBucket while the object remains
 */
const delFixtureBucket = async (
  input: { name: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  const s3 = new S3Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: input.name, Key: KEY }));
  } catch (error) {
    // an absent bucket already holds no object — the desired state
    if (!(error instanceof Error && error.name === 'NoSuchBucket')) throw error;
  }
  await delBucket({ name: input.name }, context);
};

/**
 * .what = integration test for `delBucket`'s refusal paths, against real s3
 * .why = `delBucket` is an external contract, and its BucketNotEmpty branch is a real aws error
 *   response that the unit test only builds by hand. this drives the live refusal and pins that it
 *   surfaces as the named error with its fix, rather than a raw sdk throw
 * .note
 *   - the bucket is NEVER versioned, so one DeleteObject empties it — no version or marker
 *     outlives the run, and the globally-unique name is released on cleanup
 *   - the object is arranged with a raw `PutObject`: no communicator writes objects, since
 *     objects are not a resource this package declares
 */
describe('delBucket', () => {
  const name = `declastruct-test-sdkdel-${genTestUuid().slice(0, 8)}`;

  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();
    await delFixtureBucket({ name }, context);
    return { context };
  });

  afterAll(async () => {
    const context = await getSampleAwsApiContext();
    await delFixtureBucket({ name }, context);
  });

  given('[case1] a bucket that still holds an object', () => {
    const arranged = useBeforeAll(async () => {
      const { context } = scene;
      await createBucket(
        { name, region: context.aws.credentials.region },
        context,
      );
      const s3 = new S3Client(
        getAwsClientConfig({ region: context.aws.credentials.region }),
      );
      await s3.send(
        new PutObjectCommand({ Bucket: name, Key: KEY, Body: 'fixture' }),
      );
      return { context };
    });

    when('[t0] the bucket is deleted', () => {
      then('it fails loud with the named BucketNotEmpty error', async () => {
        const error = await getError(delBucket({ name }, arranged.context));
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('BucketNotEmpty');
        expect(error.message).toContain(`bucket "${name}"`);
        expect(error.message).toContain('fix:');

        // the bucket name carries a per-run uuid, so it is masked before the snap
        expect({
          message: error.message.split(name).join('<bucket>'),
        }).toMatchSnapshot();
      });

      then('the bucket survives — no object is purged to pass', async () => {
        expect(await headBucket({ name }, arranged.context)).toBe(true);
      });
    });
  });

  given('[case2] a bucket that does not exist', () => {
    when('[t0] the bucket is deleted', () => {
      then('it resolves as a no-op, never a throw', async () => {
        await expect(
          delBucket({ name: `${name}-absent` }, scene.context),
        ).resolves.toBeUndefined();
      });
    });
  });
});
