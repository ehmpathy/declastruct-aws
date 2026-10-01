import { type HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import { DeclaredAwsS3Bucket } from '@src/domain.objects/DeclaredAwsS3Bucket';
import { DeclaredAwsS3BucketAccess } from '@src/domain.objects/DeclaredAwsS3BucketAccess';
import { DeclaredAwsS3BucketLifecycle } from '@src/domain.objects/DeclaredAwsS3BucketLifecycle';
import { DeclaredAwsS3BucketLifecycleMultiparts } from '@src/domain.objects/DeclaredAwsS3BucketLifecycleMultiparts';
import { DeclaredAwsS3BucketLifecycleObjects } from '@src/domain.objects/DeclaredAwsS3BucketLifecycleObjects';
import {
  DECLARED_AWS_S3_STORAGE_CLASSES,
  DeclaredAwsS3BucketLifecycleTransition,
  isDeclaredAwsS3StorageClass,
} from '@src/domain.objects/DeclaredAwsS3BucketLifecycleTransition';
import {
  DeclaredAwsS3BucketLifecycleVersions,
  type VersionExpiry,
} from '@src/domain.objects/DeclaredAwsS3BucketLifecycleVersions';
import { DeclaredAwsS3BucketPublicAccess } from '@src/domain.objects/DeclaredAwsS3BucketPublicAccess';
import { DeclaredAwsTags } from '@src/domain.objects/DeclaredAwsTags';
import {
  AWS_S3_BUCKET_VERSION_STATUS_BY_HOUSE_WORD,
  asHouseS3BucketVersionStatus,
  isAwsS3BucketVersionStatus,
} from '@src/domain.objects/isAwsS3BucketVersionStatus';
import type { S3BucketLifecycleParams } from '@src/domain.objects/S3BucketLifecycleParams';
import type { S3BucketPublicAccessBlockParams } from '@src/domain.objects/S3BucketPublicAccessBlockParams';

import { assureS3BucketModeledValue } from './getS3BucketUnmodeledValueError';

/**
 * .what = the noncurrent-version expiry read (two nullable axes) as the declared union
 * .why = the union makes an all-null arm untypeable (F18, I-9); the sdk read gives two nullables,
 *   so collapse them to the arm that matches. a both-null read is the untypeable all-null arm — a
 *   boundary violation, not a value to pass on, so fail loud rather than a blind `as number` that
 *   would emit an illegal domain value (rule.forbid.as-cast, rule.forbid.failhide)
 */
const asVersionExpiry = (input: {
  afterDays: number | null;
  keep: number | null;
}): VersionExpiry => {
  if (input.afterDays != null)
    return { after: { days: input.afterDays }, keep: input.keep };
  if (input.keep != null) return { after: null, keep: input.keep };
  return UnexpectedCodePathError.throw(
    'noncurrent-version expiry read had neither an age nor a count axis (the untypeable all-null arm, F18/I-9)',
    { input },
  );
};

/**
 * .what = transforms the raw S3 bucket reads (public-access + version-state + lifecycle + tags)
 *   into a canonical DeclaredAwsS3Bucket
 * .why = the canonicalizer that makes the SECOND plan read KEEP — it collapses aws's shape to
 *   ours so a re-plan converges (the remote operand of the compare; the desired operand is the
 *   caller's object, canonicalized by the constructors)
 *
 * .note
 *   - `access`: an absent public-access block reads as the UNBLOCKED posture (all four false, I-8),
 *     never as secure — an omitted control that is genuinely false must plan UPDATE, not false-KEEP
 *     an exposed bucket. the constructor canonicalizes a declared `'blocked'` to the same explicit
 *     all-true object this cast produces (case=1)
 *   - `lifecycle`: null (persist) ONLY when neither versioning nor a lifecycle rule exists; else
 *     the `{ objects, versions, multiparts }` object, with `versions: false` when unversioned (F16)
 */
export const castIntoDeclaredAwsS3Bucket = (input: {
  name: string;
  publicAccessBlock: S3BucketPublicAccessBlockParams | null;
  versionStatus: string | null;
  lifecycle: S3BucketLifecycleParams | null;
  tags: Record<string, string> | null;
}): HasReadonly<typeof DeclaredAwsS3Bucket> => {
  // an absent block reads as unblocked (all false) — never secure (I-8)
  const block = input.publicAccessBlock ?? {
    blockPublicAcls: false,
    ignorePublicAcls: false,
    blockPublicPolicy: false,
    restrictPublicBuckets: false,
  };
  const access = new DeclaredAwsS3BucketAccess({
    public: new DeclaredAwsS3BucketPublicAccess({
      acls: { block: block.blockPublicAcls, ignore: block.ignorePublicAcls },
      policies: {
        block: block.blockPublicPolicy,
        restrict: block.restrictPublicBuckets,
      },
    }),
  });

  // fail loud on an unmodeled aws version-state value, never degrade it to null (I-5, case=4). a
  // null versionStatus is the genuine never-configured read; any present string must be a modeled
  // value or this throws, so an unknown enum member is distinguishable from an absent read
  const versionStatus =
    input.versionStatus === null
      ? null
      : assureS3BucketModeledValue({
          bucket: input.name,
          field: 'versions.status',
          value: input.versionStatus,
          isModeled: isAwsS3BucketVersionStatus,
          modeled: Object.values(AWS_S3_BUCKET_VERSION_STATUS_BY_HOUSE_WORD),
        });

  // I-7: a NoncurrentVersionExpiration read with NO version-state is an unrepresentable pair — the
  // two reads CONFLICT, and the cast cannot represent the pair. fail loud rather than drop the
  // expiry or synthesize a versions object (rule.forbid.failhide). since the read itself fails, no
  // declaration can repair it — so the fix names the two out-of-band commands that settle the pair
  if (versionStatus === null && input.lifecycle?.versionExpiry != null)
    UnexpectedCodePathError.throw(
      `bucket "${input.name}" has a noncurrent-version expiry rule but was never versioned, a pair declastruct-aws cannot represent (the rule has no versions to act on). it fails loud rather than drop the rule or invent a version state. fix: if the wish declares versions, enable them first — \`aws s3api put-bucket-versioning --bucket ${input.name} --versioning-configuration Status=Enabled\`; else clear the rule — \`aws s3api delete-bucket-lifecycle --bucket ${input.name}\` — and the next apply rewrites the rule the wish declares`,
      { bucket: input.name, versionExpiry: input.lifecycle.versionExpiry },
    );

  // lifecycle is persist (null) only when NOTHING is configured — no version-state AND no rule
  const lifecycle =
    versionStatus === null && input.lifecycle === null
      ? null
      : new DeclaredAwsS3BucketLifecycle({
          objects: new DeclaredAwsS3BucketLifecycleObjects({
            expire:
              input.lifecycle?.objectExpireDays != null
                ? { days: input.lifecycle.objectExpireDays }
                : null,
            transitions: (input.lifecycle?.transitions ?? []).map(
              (transition) =>
                new DeclaredAwsS3BucketLifecycleTransition({
                  afterDays: transition.afterDays,
                  // fail loud on an aws class outside our modeled union, never a silent mistype
                  // that would skew a plan diff (rule.require.assure-via-type-checks)
                  class: assureS3BucketModeledValue({
                    bucket: input.name,
                    field: 'lifecycle.objects.transitions[].class',
                    value: transition.class,
                    isModeled: isDeclaredAwsS3StorageClass,
                    modeled: DECLARED_AWS_S3_STORAGE_CLASSES,
                  }),
                }),
            ),
          }),
          versions:
            versionStatus === null
              ? false
              : new DeclaredAwsS3BucketLifecycleVersions({
                  // wire to domain: the inverse of the write side's map, from the same record
                  status: asHouseS3BucketVersionStatus(versionStatus),
                  expire: input.lifecycle?.versionExpiry
                    ? asVersionExpiry(input.lifecycle.versionExpiry)
                    : null,
                }),
          multiparts: new DeclaredAwsS3BucketLifecycleMultiparts({
            expire:
              input.lifecycle?.multipartExpireDays != null
                ? { days: input.lifecycle.multipartExpireDays }
                : null,
          }),
        });

  return assure(
    DeclaredAwsS3Bucket.as({
      name: input.name,
      access,
      lifecycle,
      tags: input.tags ? new DeclaredAwsTags(input.tags) : null,
    }),
    hasReadonly({ of: DeclaredAwsS3Bucket }),
  );
};
