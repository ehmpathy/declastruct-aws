import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import { createBucket } from '@src/access/sdks/sdkS3/createBucket';
import { delBucketLifecycle } from '@src/access/sdks/sdkS3/delBucketLifecycle';
import { getBucketLifecycle } from '@src/access/sdks/sdkS3/getBucketLifecycle';
import { putBucketLifecycle } from '@src/access/sdks/sdkS3/putBucketLifecycle';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsS3Bucket } from '@src/domain.objects/DeclaredAwsS3Bucket';

import { asBucketLifecycleTransitionParams } from './asBucketLifecycleTransitionParams';
import { getOneS3Bucket } from './getOneS3Bucket';
import { reconcileS3BucketTags } from './reconcileS3BucketTags';

/**
 * .what = creates or updates an S3 bucket (findsert | upsert)
 * .why = enables declarative management of the inbound mail store
 *
 * .idempotency
 *   - findsert on the FULL unique key (name = the whole natural identity): look up by name,
 *     return the extant if present, else CreateBucket (a re-create of our own bucket is a
 *     no-op via BucketAlreadyOwnedByYou). a re-run converges to KEEP.
 *   - lifecycle + tags reconcile independently to the desired state on every upsert.
 */
export const setS3Bucket = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsS3Bucket;
      upsert: DeclaredAwsS3Bucket;
    }>,
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<HasReadonly<typeof DeclaredAwsS3Bucket>> => {
    const desired = input.findsert ?? input.upsert;

    // find the extant bucket by unique name
    const foundBefore = await getOneS3Bucket(
      { by: { unique: { name: desired.name } } },
      context,
    );

    // findsert: return the extant unchanged
    if (foundBefore && input.findsert) return foundBefore;

    // create-or-adopt the bucket (idempotent for our own bucket)
    await createBucket(
      { name: desired.name, region: context.aws.credentials.region },
      context,
    );

    // reconcile the lifecycle to the desired config (null = drop the rule = persist)
    if (desired.lifecycle) {
      await putBucketLifecycle(
        {
          name: desired.name,
          transitions: asBucketLifecycleTransitionParams({
            transitions: desired.lifecycle.transitions,
          }),
          expireAfterDays: desired.lifecycle.expireAfterDays,
        },
        context,
      );

      // PutBucketLifecycleConfiguration is eventually consistent — a GET right after the PUT
      // can flap between the new rule and NoSuchLifecycleConfiguration until the write settles
      // across s3's systems. a SINGLE matched read is not enough: it can regress to null on
      // the very next read. so poll until the desired transition count reads back on several
      // CONSECUTIVE reads, which crosses the window where reads still flap and makes both the
      // returned object AND any immediate re-read converge to KEEP against live truth
      // (rule.require.guaranteed-idempotency + rule.require.immutable-source-of-truth).
      const stableReadsNeeded = 3;
      const deadline = Date.now() + 60000;
      let stableReads = 0;
      while (Date.now() < deadline && stableReads < stableReadsNeeded) {
        const live = await getBucketLifecycle({ name: desired.name }, context);
        stableReads =
          live?.transitions.length === desired.lifecycle.transitions.length
            ? stableReads + 1
            : 0;
        if (stableReads < stableReadsNeeded)
          await new Promise((wake) => setTimeout(wake, 1000));
      }
    }
    if (!desired.lifecycle)
      await delBucketLifecycle({ name: desired.name }, context);

    // reconcile tags to the desired set
    await reconcileS3BucketTags(
      {
        name: desired.name,
        desired: desired.tags ? { ...desired.tags } : null,
      },
      context,
    );

    // read back the written bucket
    const foundAfter = await getOneS3Bucket(
      { by: { unique: { name: desired.name } } },
      context,
    );

    // failfast if absent after set
    if (!foundAfter)
      UnexpectedCodePathError.throw('s3 bucket not found after set', {
        desired,
      });

    return foundAfter;
  },
);
