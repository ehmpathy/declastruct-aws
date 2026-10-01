import { DomainLiteral } from 'domain-objects';

import { DeclaredAwsS3BucketLifecycleTransition } from './DeclaredAwsS3BucketLifecycleTransition';
import { IsoDurationInDays } from './IsoDurationInDays';

/**
 * .what = the lifecycle rules for the CURRENT objects in a bucket (aws LifecycleExpiration +
 *   Transitions)
 * .why = the "what expires" decomposition (F16): `objects` covers every bucket, versioned or
 *   not — the current version of each object, its transitions to colder classes, and when it
 *   expires
 *
 * .note = `expire` is the age after creation before a current object is deleted; null = never
 *   expire (keep every current object forever)
 */
export interface DeclaredAwsS3BucketLifecycleObjects {
  /**
   * .what = the age after object creation before a current object expires (is deleted)
   * .note = null = never expire (aws sends no `Expiration`)
   */
  expire: IsoDurationInDays | null;

  /**
   * .what = the ordered transitions (each moves current objects to a colder class after N days)
   */
  transitions: DeclaredAwsS3BucketLifecycleTransition[];
}

export class DeclaredAwsS3BucketLifecycleObjects
  extends DomainLiteral<DeclaredAwsS3BucketLifecycleObjects>
  implements DeclaredAwsS3BucketLifecycleObjects
{
  /**
   * .what = nested domain object definitions
   * .note = `expire` hydrates as an `IsoDurationInDays` leaf (null is skipped)
   */
  public static nested = {
    transitions: DeclaredAwsS3BucketLifecycleTransition,
    expire: IsoDurationInDays,
  };
}
