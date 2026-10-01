import { BadRequestError } from 'helpful-errors';

import { assertS3BucketLifecycleDaysInBounds } from '@src/domain.objects/assertS3BucketLifecycleDaysInBounds';
import { assertS3BucketVersionKeepCountInBounds } from '@src/domain.objects/assertS3BucketVersionKeepCountInBounds';
import type { DeclaredAwsS3BucketLifecycle } from '@src/domain.objects/DeclaredAwsS3BucketLifecycle';
import type { S3BucketLifecycleParams } from '@src/domain.objects/S3BucketLifecycleParams';

import { asBucketLifecycleTransitionParams } from './asBucketLifecycleTransitionParams';

/**
 * .what = collapses the declared `{ objects, versions, multiparts }` lifecycle to the day-count wire
 *   params aws speaks
 * .why = the sdk `putBucketLifecycle` speaks day-counts, not `IsoDurationInDays`; this is the one
 *   procedure that translates, AND it runs the runtime checks the narrow types leave open — it asserts
 *   each desired duration is a POSITIVE WHOLE day, and each `keep` count is within aws's 1-100 bounds,
 *   before either reaches aws (F17). extracted out of `setS3Bucket` so the orchestrator reads as
 *   narrative (rule.require.orchestrators-as-narrative)
 */
export const asS3BucketLifecycleParams = (input: {
  lifecycle: DeclaredAwsS3BucketLifecycle;
}): S3BucketLifecycleParams => {
  const { lifecycle } = input;

  // reject each day-count that is not a POSITIVE WHOLE day, before it reaches aws (F17) — the narrow
  // type admits `{ days: 30.5 }` and `{ days: 0 }`, so this is the one runtime check the type leaves open
  const asDays = (field: string, duration: { days: number }): number => {
    assertS3BucketLifecycleDaysInBounds({ field, duration });
    return duration.days;
  };
  const objectExpireDays = lifecycle.objects.expire
    ? asDays('objects.expire', lifecycle.objects.expire)
    : null;

  const transitions = asBucketLifecycleTransitionParams({
    transitions: lifecycle.objects.transitions,
  });

  // reject a `keep` outside aws's whole-number 1-100 bounds, before it reaches the wire params
  if (lifecycle.versions && lifecycle.versions.expire?.keep != null)
    assertS3BucketVersionKeepCountInBounds({
      keep: lifecycle.versions.expire.keep,
    });

  const versionExpiry =
    lifecycle.versions && lifecycle.versions.expire
      ? {
          afterDays: lifecycle.versions.expire.after
            ? asDays('versions.expire.after', lifecycle.versions.expire.after)
            : null,
          keep: lifecycle.versions.expire.keep ?? null,
        }
      : null;

  // I-9: the VersionExpiry union requires at least one axis — both-null is unrepresentable.
  // the type prevents it at compile time for literal callers; this guard catches dynamic callers
  if (
    versionExpiry != null &&
    versionExpiry.afterDays == null &&
    versionExpiry.keep == null
  )
    throw new BadRequestError(
      'a version expiry must declare at least one axis: `after` (age), `keep` (count), or both',
      { versionExpiry, fix: 'set `expire.after`, `expire.keep`, or both' },
    );

  const multipartExpireDays = lifecycle.multiparts.expire
    ? asDays('multiparts.expire', lifecycle.multiparts.expire)
    : null;

  return { transitions, objectExpireDays, versionExpiry, multipartExpireDays };
};
