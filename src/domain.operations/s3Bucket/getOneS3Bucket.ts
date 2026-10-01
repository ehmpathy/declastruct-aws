import { asProcedure } from 'as-procedure';
import type {
  HasReadonly,
  Ref,
  RefByPrimary,
  RefByUnique,
} from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import { getBucketLifecycle } from '@src/access/sdks/sdkS3/getBucketLifecycle';
import { getBucketPublicAccessBlock } from '@src/access/sdks/sdkS3/getBucketPublicAccessBlock';
import { getBucketTags } from '@src/access/sdks/sdkS3/getBucketTags';
import { getBucketVersioning } from '@src/access/sdks/sdkS3/getBucketVersioning';
import { headBucket } from '@src/access/sdks/sdkS3/headBucket';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsS3Bucket } from '@src/domain.objects/DeclaredAwsS3Bucket';

import { asS3BucketReadsFulfilled } from './asS3BucketReadsFulfilled';
import { castIntoDeclaredAwsS3Bucket } from './castIntoDeclaredAwsS3Bucket';

/**
 * .what = gets a single S3 bucket from aws by primary (name), unique (name), or ref
 * .why = enables declarative drift detection; returns null when absent so the plan reads
 *   CREATE rather than throw (rule.forbid.plan-fail-on-apply-guided-prereq)
 */
export const getOneS3Bucket = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsS3Bucket>;
        unique: RefByUnique<typeof DeclaredAwsS3Bucket>;
        ref: Ref<typeof DeclaredAwsS3Bucket>;
      }>;
    },
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<HasReadonly<typeof DeclaredAwsS3Bucket> | null> => {
    // name is the whole identity across primary, unique, and ref
    const name =
      input.by.primary?.name ?? input.by.unique?.name ?? input.by.ref?.name;
    if (!name)
      UnexpectedCodePathError.throw('getOneS3Bucket got a ref with no name', {
        input,
      });

    // head the bucket (false if absent or not ours).
    //
    // ⚠️ the head stays SEQUENTIAL, deliberately — it is the one read the others depend on.
    // it gates the early `null` return, and on the common fresh-CREATE path it is what keeps
    // us from four pointless round-trips against a bucket that does not exist yet
    const found = await headBucket({ name }, context);
    if (!found) return null;

    // read the four bucket-level properties IN PARALLEL.
    //
    // .why = none of the four depends on another's result, and this read fires on EVERY bucket
    //   on EVERY plan — `getOneS3Bucket` reads unconditionally rather than branch on what the
    //   consumer declared, since a read-only-when-declared branch would break drift detection
    //   (A-8, rule.require.immutable-source-of-truth). so the latency here is paid by every
    //   consumer on every plan, and four sequential round-trips is four times the wait for no gain
    //
    // .note = each communicator already degrades its own absent-signal to `null` internally and
    //   rethrows all else, so the only errors that reach here are ones that must propagate loud
    //   either way (esp. `AccessDenied` — an absent iam READ grant is a phantom CREATE if
    //   swallowed, case=6 [t2]). the one real difference from the sequential form is that a
    //   failed read no longer short-circuits its three peers, so all four fire before the
    //   rejection surfaces — more calls on a path that already fails, same outcome
    //
    // ⚠️ it is `allSettled`, NOT `all` — `Promise.all` keeps only the FIRST settled rejection and
    //   discards its peers, which would make a multi-cause failure report a different cause per
    //   run. `asS3BucketReadsFulfilled` carries the whole argument and the unwrap
    const settled = await Promise.allSettled([
      // the public-access block (null = never set = the unblocked posture, I-8)
      getBucketPublicAccessBlock({ name }, context),
      // the version-state (null = never versioned)
      getBucketVersioning({ name }, context),
      // the lifecycle config (null = no rule)
      getBucketLifecycle({ name }, context),
      // the tags (null = no tags)
      getBucketTags({ name }, context),
    ]);
    const [publicAccessBlock, versionStatus, lifecycle, tags] =
      asS3BucketReadsFulfilled({ name, settled });

    // cast to domain format
    return castIntoDeclaredAwsS3Bucket({
      name,
      publicAccessBlock,
      versionStatus,
      lifecycle,
      tags,
    });
  },
);
