import { HelpfulError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';

import { getBucketVersioning } from '@src/access/sdks/sdkS3/getBucketVersioning';
import { putBucketVersioning } from '@src/access/sdks/sdkS3/putBucketVersioning';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsS3Bucket } from '@src/domain.objects/DeclaredAwsS3Bucket';
import {
  asAwsS3BucketVersionStatus,
  isAwsS3BucketVersionStatus,
} from '@src/domain.objects/isAwsS3BucketVersionStatus';

import { awaitStableReads } from './awaitStableReads';

/**
 * .what = the one IRREVERSIBLE write of an s3 bucket upsert: the version-state put, plus the
 *   stability poll that confirms it landed.
 *
 * .why = the named twin of `setS3BucketPropertiesReversible`, and it exists for the same reason:
 *   invariant I-1 must be STRUCTURAL rather than positional. aws cannot return a versioned bucket
 *   to never-versioned, so this step must run only after every reversible step has succeeded.
 *
 *   ⇒ with BOTH halves named, `setS3Bucket`'s body is two calls whose order IS the invariant. a
 *   refactor that would break I-1 must now reorder two named statements — where before, the
 *   irreversible half sat inline as an `if` block whose position read as incidental, so a hoist
 *   for readability or a parallelize for speed would have looked like a reasonable change.
 *
 * .note = a bucket declared `versions: false` is left untouched, never suspended. you cannot
 *   un-version a bucket; a `false` against a LIVE versioned bucket is rejected before any write by
 *   `assertS3BucketVersionsNotRetracted` (I-1, case=3), so arrival here with `false` means the
 *   bucket was never versioned and no write is owed.
 */
export const setS3BucketVersionStateIrreversible = async (
  input: {
    desired: DeclaredAwsS3Bucket;
    stableReadsRequired: number;
    deadlineMs: number;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  const { desired, stableReadsRequired, deadlineMs } = input;

  // a bucket with no declared version-state owes no write
  if (!desired.lifecycle || !desired.lifecycle.versions) return;

  // domain to wire: our lowercase house word to aws's capitalized wire value. the map is
  // single-sourced beside the wire union, so this direction and the read's inverse cannot drift
  const desiredStatus = asAwsS3BucketVersionStatus(
    desired.lifecycle.versions.status,
  );
  await putBucketVersioning(
    { name: desired.name, status: desiredStatus },
    context,
  );

  // F7: the version-state put has its own propagation window. poll on the Status VALUE until it
  // reads back on several CONSECUTIVE reads. the read is asserted via isAwsS3BucketVersionStatus
  // so an unmodeled value fails loud on the first read (I-5), rather than a silent loop to the
  // deadline
  await awaitStableReads({
    read: () =>
      getBucketVersioning({ name: desired.name }, context).then((raw) =>
        raw === null ? null : isAwsS3BucketVersionStatus.assure(raw),
      ),
    isStable: (live) => live === desiredStatus,
    stableReadsRequired,
    deadlineMs,
    onTimeout: (lastStatus) =>
      new HelpfulError(
        's3 bucket version-state did not converge before the stability deadline; the write may already have landed — re-read before you retry (it is the one irreversible write)',
        { name: desired.name, desiredStatus, lastStatus },
      ),
  });
};
