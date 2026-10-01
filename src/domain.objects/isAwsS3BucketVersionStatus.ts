import { UnexpectedCodePathError } from 'helpful-errors';
import { withAssure } from 'type-fns';

/**
 * .what = the ONE source of the house-word <-> aws-wire-value correspondence for version state
 * .why = the wire union, the house union, the guard, and BOTH directions below are all derived from
 *   this record, so no two of them can drift apart. two ad-hoc forms of this map previously lived at
 *   the two call sites — an inline `as const` on the write side, a ternary on the read side — with
 *   the correspondence itself declared in neither. a second copy of a wire mapping is not merely
 *   duplication; it is the permadrift hazard this wish exists to prevent: edit one direction and the
 *   round-trip silently stops to close
 *
 * .note = keyed by the HOUSE word, so the key set IS the declared field's own union
 *   (F16 sub-call 1). the values are aws's letters, verbatim
 */
export const AWS_S3_BUCKET_VERSION_STATUS_BY_HOUSE_WORD = {
  enabled: 'Enabled',
  suspended: 'Suspended',
} as const;

/**
 * .what = the closed set of aws version-state WIRE values the read can carry
 * .why = aws models exactly two — `Enabled` and `Suspended` — and OMITS the field for a
 *   never-configured bucket (the null case, handled one layer up). any OTHER string is an unmodeled
 *   aws value; the guard below fails loud on it rather than degrade it to null, which would false-KEEP
 *   a versioned bucket as never-versioned (I-5, case=4)
 *
 * .note = DERIVED from the record above, never re-listed
 */
export type AwsS3BucketVersionStatus =
  (typeof AWS_S3_BUCKET_VERSION_STATUS_BY_HOUSE_WORD)[keyof typeof AWS_S3_BUCKET_VERSION_STATUS_BY_HOUSE_WORD];

/**
 * .what = the closed set of house words the declared `versions.status` field carries
 * .note = also derived from the record, so the field's union and the map's keys cannot disagree
 */
export type HouseS3BucketVersionStatus =
  keyof typeof AWS_S3_BUCKET_VERSION_STATUS_BY_HOUSE_WORD;

/**
 * .what = our lowercase house word -> aws's capitalized wire value (the WRITE direction)
 * .why = a total record lookup, so the compiler proves every house word has a wire value. an inline
 *   ternary proves no such thing — it silently picks an arm for any word it was not written against
 */
export const asAwsS3BucketVersionStatus = (
  status: HouseS3BucketVersionStatus,
): AwsS3BucketVersionStatus =>
  AWS_S3_BUCKET_VERSION_STATUS_BY_HOUSE_WORD[status];

/**
 * .what = aws's capitalized wire value -> our lowercase house word (the READ direction)
 * .why = the inverse of the write direction, compared against the SAME record rather than against
 *   hand-typed wire letters — so aws's spelling is single-sourced across both directions
 *
 * .note = the fall-through THROWS rather than picks an arm. the extant ternary read
 *   `=== 'Enabled' ? 'enabled' : 'suspended'`, which would silently map a future third aws value to
 *   `suspended` — a false-KEEP on a bucket whose real state we do not model (rule.forbid.failhide).
 *   ⚠️ it is unreachable today: `isAwsS3BucketVersionStatus.assure` narrows at the read boundary
 *   first, so an unmodeled value fails loud THERE (I-5, case=4). this is the second net, not the first
 */
export const asHouseS3BucketVersionStatus = (
  status: AwsS3BucketVersionStatus,
): HouseS3BucketVersionStatus => {
  if (status === AWS_S3_BUCKET_VERSION_STATUS_BY_HOUSE_WORD.enabled)
    return 'enabled';
  if (status === AWS_S3_BUCKET_VERSION_STATUS_BY_HOUSE_WORD.suspended)
    return 'suspended';
  return UnexpectedCodePathError.throw(
    'aws version-state wire value has no house word; the wire union grew and this inverse did not',
    { status },
  );
};

/**
 * .what = asserts a raw version-state Status string is one this package models
 * .why = the communicator passes the raw string through (never degrades an unknown value); this
 *   guard is the one boundary that fails loud on an aws value outside the modeled set, so a future
 *   status enum member is DISTINGUISHABLE from a genuine absent read (rule.require.assure-via-type-checks,
 *   rule.forbid.failhide). mirrors the `isDeclaredAwsS3StorageClass` trio precedent
 */
export const isAwsS3BucketVersionStatus = withAssure(
  (value: unknown): value is AwsS3BucketVersionStatus =>
    value === 'Enabled' || value === 'Suspended',
  { name: 'isAwsS3BucketVersionStatus' },
);
