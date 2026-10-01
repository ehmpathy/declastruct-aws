import { DomainLiteral } from 'domain-objects';

import { DeclaredAwsS3BucketLifecycleMultiparts } from './DeclaredAwsS3BucketLifecycleMultiparts';
import { DeclaredAwsS3BucketLifecycleObjects } from './DeclaredAwsS3BucketLifecycleObjects';
import { DeclaredAwsS3BucketLifecycleVersions } from './DeclaredAwsS3BucketLifecycleVersions';

/**
 * .what = an S3 bucket lifecycle config, decomposed by WHAT EXPIRES (F16)
 * .why = a flat `expireAfterDays` named no subject — which thing expires? this factors the
 *   lifecycle into three orthogonal subjects, each with its own `.expire` (one verb, three
 *   motives), so a backup store can keep every current object forever yet still bound the
 *   noncurrent-version pile and abort dead multipart uploads
 *
 * .note
 *   - `objects` covers ANY bucket (current-version expiry + transitions)
 *   - `versions` is `false` (never-versioned) or the versioning + noncurrent-expiry config;
 *     `expire` is unreachable unless `status` is set
 *   - `multiparts` aborts incomplete uploads
 *   - a null lifecycle on the bucket = persist (no rule at all)
 *   - declastruct manages a SINGLE whole-bucket rule (rule.prefer.wet-over-dry)
 */
export interface DeclaredAwsS3BucketLifecycle {
  /**
   * .what = the current-object rules (expiry + transitions) — apply to any bucket
   */
  objects: DeclaredAwsS3BucketLifecycleObjects;

  /**
   * .what = the versioning + noncurrent-version-expiry config
   * .note = `false` = never-versioned; else `{ status, expire }`
   */
  versions: false | DeclaredAwsS3BucketLifecycleVersions;

  /**
   * .what = the incomplete-multipart-upload abort rule
   */
  multiparts: DeclaredAwsS3BucketLifecycleMultiparts;
}

export class DeclaredAwsS3BucketLifecycle
  extends DomainLiteral<DeclaredAwsS3BucketLifecycle>
  implements DeclaredAwsS3BucketLifecycle
{
  /**
   * .what = nested domain object definitions
   * .note = `versions` nests one option; a bare `false` scalar is left un-hydrated
   *   (domain-objects skips bare values under a nested key)
   */
  public static nested = {
    objects: DeclaredAwsS3BucketLifecycleObjects,
    versions: DeclaredAwsS3BucketLifecycleVersions,
    multiparts: DeclaredAwsS3BucketLifecycleMultiparts,
  };
}
