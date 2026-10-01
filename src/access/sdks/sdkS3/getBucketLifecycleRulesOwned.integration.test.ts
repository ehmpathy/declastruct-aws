import {
  DeleteBucketLifecycleCommand,
  type LifecycleRule,
  PutBucketLifecycleConfigurationCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { BadRequestError, getError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';
import { createBucket } from './createBucket';
import { DECLASTRUCT_LIFECYCLE_RULE_ID } from './declastructLifecycleRuleId';
import { delBucket } from './delBucket';
import { getBucketLifecycleRulesOwned } from './getBucketLifecycleRulesOwned';

const FOREIGN_RULE_ID = 'console-added-rule';

/**
 * .what = a minimal enabled rule with one action, keyed by the given id
 * .why = aws refuses an actionless rule; an abort-multipart action is the cheapest valid one
 */
const asFixtureRule = (input: { id: string }): LifecycleRule => ({
  ID: input.id,
  Status: 'Enabled',
  Filter: { Prefix: '' },
  AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 },
});

/**
 * .what = writes the given rules onto the bucket with a raw sdk call
 * .why = a foreign rule is out-of-band by definition, so no declared write can arrange it
 */
const setFixtureRules = async (
  input: { name: string; rules: LifecycleRule[] },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  const s3 = new S3Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );
  await s3.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: input.name,
      LifecycleConfiguration: { Rules: input.rules },
    }),
  );
};

/**
 * .what = drops every lifecycle rule, then the bucket — both idempotent against an absent bucket
 * .why = both-ends cleanup; the declared delete refuses a foreign rule, so teardown goes raw
 */
const delFixtureBucket = async (
  input: { name: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  const s3 = new S3Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );
  try {
    await s3.send(new DeleteBucketLifecycleCommand({ Bucket: input.name }));
  } catch (error) {
    // an absent bucket already holds no rule — the desired state
    if (!(error instanceof Error && error.name === 'NoSuchBucket')) throw error;
  }
  await delBucket({ name: input.name }, context);
};

/**
 * .what = integration test for `getBucketLifecycleRulesOwned`, against real s3
 * .why = it is the external-contract read both replace-all mutations share. this pins its four
 *   live response shapes: no config → null, owned-only → the owned rules, a foreign rule → the
 *   named fail-loud error, an absent bucket → null
 * .note = the cases share one bucket and run in declared order; each arranges its own rule state
 */
describe('getBucketLifecycleRulesOwned', () => {
  const name = `declastruct-test-sdklcy-${genTestUuid().slice(0, 8)}`;

  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();
    await delFixtureBucket({ name }, context);
    await createBucket(
      { name, region: context.aws.credentials.region },
      context,
    );
    return { context };
  });

  afterAll(async () => {
    const context = await getSampleAwsApiContext();
    await delFixtureBucket({ name }, context);
  });

  given('[case1] a bucket with no lifecycle configuration', () => {
    when('[t0] the owned rules are read', () => {
      then('it returns null — no rule to protect', async () => {
        expect(
          await getBucketLifecycleRulesOwned({ name }, scene.context),
        ).toBeNull();
      });
    });
  });

  given('[case2] a bucket that holds only the declastruct-owned rule', () => {
    const arranged = useBeforeAll(async () => {
      await setFixtureRules(
        { name, rules: [asFixtureRule({ id: DECLASTRUCT_LIFECYCLE_RULE_ID })] },
        scene.context,
      );
      return { context: scene.context };
    });

    when('[t0] the owned rules are read', () => {
      then('it returns exactly the owned rule', async () => {
        const rules = await getBucketLifecycleRulesOwned(
          { name },
          arranged.context,
        );
        expect(rules?.map((rule) => rule.ID)).toEqual([
          DECLASTRUCT_LIFECYCLE_RULE_ID,
        ]);
        expect(rules?.[0]?.AbortIncompleteMultipartUpload).toEqual({
          DaysAfterInitiation: 7,
        });
        expect(rules).toMatchSnapshot();
      });
    });
  });

  given('[case3] a bucket that also holds a foreign rule', () => {
    const arranged = useBeforeAll(async () => {
      await setFixtureRules(
        {
          name,
          rules: [
            asFixtureRule({ id: DECLASTRUCT_LIFECYCLE_RULE_ID }),
            asFixtureRule({ id: FOREIGN_RULE_ID }),
          ],
        },
        scene.context,
      );
      return { context: scene.context };
    });

    when('[t0] the owned rules are read', () => {
      then('it fails loud and names the foreign rule', async () => {
        const error = await getError(
          getBucketLifecycleRulesOwned({ name }, arranged.context),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain(`bucket "${name}"`);
        expect(error.message).toContain(`[${FOREIGN_RULE_ID}]`);
        expect(error.message).toContain('fix by one of');

        // the bucket name carries a per-run uuid, so it is masked before the snap
        expect({
          message: error.message.split(name).join('<bucket>'),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case4] a bucket that does not exist', () => {
    when('[t0] the owned rules are read', () => {
      then('it reads as null, never throws', async () => {
        expect(
          await getBucketLifecycleRulesOwned(
            { name: `${name}-absent` },
            scene.context,
          ),
        ).toBeNull();
      });
    });
  });
});
