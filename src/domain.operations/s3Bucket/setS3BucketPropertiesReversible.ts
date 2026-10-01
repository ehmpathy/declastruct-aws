import { HelpfulError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';

import { createBucket } from '@src/access/sdks/sdkS3/createBucket';
import { getBucketLifecycle } from '@src/access/sdks/sdkS3/getBucketLifecycle';
import { putBucketLifecycle } from '@src/access/sdks/sdkS3/putBucketLifecycle';
import { putBucketPublicAccessBlock } from '@src/access/sdks/sdkS3/putBucketPublicAccessBlock';
import { asCanonicalS3BucketPublicAccess } from '@src/domain.objects/asCanonicalS3BucketPublicAccess';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsS3Bucket } from '@src/domain.objects/DeclaredAwsS3Bucket';

import { asS3BucketLifecycleRuleToWrite } from './asS3BucketLifecycleRuleToWrite';
import { awaitStableReads } from './awaitStableReads';
import { doesS3BucketLifecycleReadMatchDesired } from './doesS3BucketLifecycleReadMatchDesired';
import { reconcileS3BucketTags } from './reconcileS3BucketTags';
import { retractS3BucketLifecycle } from './retractS3BucketLifecycle';

/**
 * .what = every REVERSIBLE write of an s3 bucket upsert: create-or-adopt, lifecycle, public-access
 *   block, tags. each converges on a retry, so a partial apply of this set is recoverable.
 *
 * .why = it exists to make invariant I-1 STRUCTURAL rather than positional. the version-state put is
 *   the one irreversible write in this wish, and it must run only after every reversible write has
 *   succeeded. before this split, that order was carried by ~90 lines of statements whose sequence
 *   was indistinguishable from an arbitrary one — a later refactor that hoisted the version-state
 *   put, or parallelized the block, would have read as a reasonable speed change.
 *
 *   ⚠️ the hazard is not hypothetical: a "parallelize for speed" change landed on the READ side of
 *   this same resource (`getOneS3Bucket`'s `Promise.allSettled`), and the identical instinct applied
 *   here would leave a bucket versioned-by-accident with no noncurrent-expiry rule — the exact cost
 *   leak this wish exists to close.
 *
 *   ⇒ with the reversible set behind one name, `setS3Bucket` reads as TWO statements: this, then the
 *   irreversible step. the reorder-risk surface shrinks from a long block to one adjacency.
 *
 * .note = the split does NOT remove the order obligation, it relocates and shrinks it. INSIDE
 *   this operation `createBucket` must still lead — every write below it targets a bucket that must
 *   already exist. what the split buys is that the one constraint a reader must not break is now
 *   visible at the call site rather than buried mid-block.
 */
export const setS3BucketPropertiesReversible = async (
  input: {
    desired: DeclaredAwsS3Bucket;
    stableReadsRequired: number;
    deadlineMs: number;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  const { desired, stableReadsRequired, deadlineMs } = input;

  // create-or-adopt the bucket (idempotent for our own bucket). ⚠️ this must LEAD — every write
  // below targets a bucket that must already exist
  await createBucket(
    { name: desired.name, region: context.aws.credentials.region },
    context,
  );

  // reconcile the lifecycle to the desired config (reversible).
  //
  // ⚠️ the decision is computed ONCE, for every declaration shape — `lifecycle: null`, a
  // version-state-only lifecycle, and one that carries a rule all go through the same cast. `null`
  // back means "no rule on the bucket", whichever of those reasons produced it, so the retract
  // below has exactly ONE call site rather than one per reason
  //
  // ⚠️ the cast THROWS on a fully-actionless lifecycle (case=8 / I-6), and it runs AFTER
  // `createBucket` above — unlike the I-1 guard in `setS3Bucket`, it is NOT before every aws write.
  // that is safe (createBucket is idempotent, so a reject leaves an empty bucket a retry adopts)
  const lifecycleRule = asS3BucketLifecycleRuleToWrite({
    lifecycle: desired.lifecycle,
  });

  if (lifecycleRule) {
    await putBucketLifecycle({ name: desired.name, ...lifecycleRule }, context);

    // PutBucketLifecycleConfiguration is eventually consistent — poll until the FULL rule
    // signature reads back on several CONSECUTIVE reads (F6)
    await awaitStableReads({
      read: () => getBucketLifecycle({ name: desired.name }, context),
      isStable: (live) =>
        doesS3BucketLifecycleReadMatchDesired({
          live,
          desired: lifecycleRule,
        }),
      stableReadsRequired,
      deadlineMs,
      onTimeout: (lastRead) =>
        new HelpfulError(
          's3 bucket lifecycle did not converge before the stability deadline',
          { name: desired.name, desired: lifecycleRule, lastRead },
        ),
    });
  }

  if (!lifecycleRule)
    // no rule belongs on this bucket — retract. the version-state, if any, is put by the caller
    await retractS3BucketLifecycle(
      { name: desired.name, stableReadsRequired, deadlineMs },
      context,
    );

  // reconcile the public-access block (reversible). `asCanonicalS3BucketPublicAccess` narrows
  // the TS type from `'blocked' | DeclaredAwsS3BucketPublicAccess` to the explicit object whose
  // `.acls`/`.policies` fields are accessible — the runtime value is already canonical from
  // the constructor, but the static type requires the call for field access
  const publicAccess = asCanonicalS3BucketPublicAccess(desired.access.public);
  await putBucketPublicAccessBlock(
    {
      name: desired.name,
      blockPublicAcls: publicAccess.acls.block,
      ignorePublicAcls: publicAccess.acls.ignore,
      blockPublicPolicy: publicAccess.policies.block,
      restrictPublicBuckets: publicAccess.policies.restrict,
    },
    context,
  );

  // reconcile tags to the desired set (reversible)
  await reconcileS3BucketTags(
    {
      name: desired.name,
      desired: desired.tags ? { ...desired.tags } : null,
    },
    context,
  );
};
