import { BadRequestError } from 'helpful-errors';

import type { DeclaredAwsS3Bucket } from '@src/domain.objects/DeclaredAwsS3Bucket';

/**
 * .what = rejects an attempt to un-version a live Enabled/Suspended bucket, BEFORE any write (I-1,
 *   case=3)
 * .why = a bucket's version-state is aws's one IRREVERSIBLE property — once a bucket has been Enabled
 *   it can only ever be Suspended, never returned to never-versioned. a desired `versions: false` (or
 *   a null lifecycle) against a live versioned bucket is therefore an impossible request: to skip the
 *   write would leave the bucket versioned forever, so the plan reads UPDATE forever and no apply can
 *   close it — a silent permadrift (rule.forbid.failhide). fail loud instead, and name the only legal
 *   move: `status: 'suspended'` (rule.require.errors-name-the-fix)
 *
 * .note = the live version-state comes from the read-back bucket (`found`); a null `found` (a create)
 *   has no live version-state, so no retract is possible. the desired end-state is un-versioned when
 *   `lifecycle` is null OR `lifecycle.versions` is `false`
 */
export const assertS3BucketVersionsNotRetracted = (input: {
  desired: DeclaredAwsS3Bucket;
  found: DeclaredAwsS3Bucket | null;
}): void => {
  const { desired, found } = input;

  // the live bucket is versioned when its read-back lifecycle carries a versions object
  const liveVersions = found?.lifecycle ? found.lifecycle.versions : false;
  if (liveVersions === false) return;

  // the desired end-state is un-versioned when there is no lifecycle, or versions is false
  const desiredVersions = desired.lifecycle
    ? desired.lifecycle.versions
    : false;
  if (desiredVersions !== false) return;

  // the message names the bucket and the metadata keys it `bucket`, the same as every other s3
  // bucket error in this package, so a multi-bucket apply log reads one way
  throw new BadRequestError(
    `cannot un-version bucket "${desired.name}", which is already versioned; the aws version-state is a one-way door`,
    {
      bucket: desired.name,
      liveStatus: liveVersions.status,
      fix: "declare `versions: { status: 'suspended', expire }` to stop new versions; a bucket that was versioned cannot return to never-versioned",
    },
  );
};
