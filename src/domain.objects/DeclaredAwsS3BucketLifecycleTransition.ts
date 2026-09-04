import { DomainLiteral } from 'domain-objects';
import { withAssure } from 'type-fns';

/**
 * .what = the S3 storage classes a lifecycle transition can move an object into
 * .why = the cold/warm tiers the vision's staircase + auto-tier modes step through; a runtime
 *   const so the type AND the read-time guard derive from ONE source of truth
 */
export const DECLARED_AWS_S3_STORAGE_CLASSES = [
  'STANDARD_IA',
  'GLACIER_IR',
  'GLACIER',
  'DEEP_ARCHIVE',
  'INTELLIGENT_TIERING',
] as const;

/**
 * .what = an S3 storage class a lifecycle transition can move an object into
 */
export type DeclaredAwsS3StorageClass =
  (typeof DECLARED_AWS_S3_STORAGE_CLASSES)[number];

/**
 * .what = asserts a raw aws string is one of our modeled S3 storage classes
 * .why = a read-side cast of an aws value must fail loud on an UNMODELED class, not silently
 *   mistype it and skew a plan diff (rule.require.assure-via-type-checks, rule.forbid.as-cast).
 *   use .assure at the sdk-read boundary in castIntoDeclaredAwsS3Bucket
 */
export const isDeclaredAwsS3StorageClass = withAssure(
  (value: string): value is DeclaredAwsS3StorageClass =>
    (DECLARED_AWS_S3_STORAGE_CLASSES as readonly string[]).includes(value),
  { name: 'isDeclaredAwsS3StorageClass' },
);

/**
 * .what = one step of an S3 bucket lifecycle — move objects to a colder class after N days
 * .why = the unit the staircase (Standard -> GLACIER_IR -> DEEP_ARCHIVE) is built from; a
 *   single `afterDays: 0 -> INTELLIGENT_TIERING` step expresses the aws auto-tier mode
 */
export interface DeclaredAwsS3BucketLifecycleTransition {
  /**
   * .what = days after object creation before the transition applies
   */
  afterDays: number;

  /**
   * .what = the storage class to move the object into
   */
  class: DeclaredAwsS3StorageClass;
}

export class DeclaredAwsS3BucketLifecycleTransition
  extends DomainLiteral<DeclaredAwsS3BucketLifecycleTransition>
  implements DeclaredAwsS3BucketLifecycleTransition {}
