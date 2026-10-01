import { DomainLiteral } from 'domain-objects';

import { DeclaredAwsS3BucketVersionExpiry } from './DeclaredAwsS3BucketVersionExpiry';
import type { IsoDurationInDays } from './IsoDurationInDays';

/**
 * .what = how noncurrent versions expire — by AGE, by COUNT, or by both; never neither (F18, I-9)
 * .why = aws binds both into one container (`NoncurrentVersionExpiration.NoncurrentDays` +
 *   `.NewerNoncurrentVersions`). the union makes the all-null arm UNTYPEABLE — an "expiry rule
 *   that expires nothing" cannot be written (rule.prefer.prevent-over-correct rung 1)
 *
 * .note
 *   - `after` = age axis; a noncurrent version expires this long after it became noncurrent
 *   - `keep` = count axis; aws retains N newest noncurrent versions and deletes any BEYOND — a
 *     FLOOR, not a threshold, which is why the wisher chose `keep` over `over`
 *   - reads as a sentence: `{ after: { days: 30 }, keep: 5 }` — expire after 30 days, keep 5 newest
 *   - when BOTH are set they combine as an AND, never independently. aws: "For the deletion to
 *     occur, both the <NoncurrentDays> AND the <NewerNoncurrentVersions> values must be exceeded."
 *     ⇒ so `keep` is a floor `after` cannot cross: a 40-day-old version that is among the 5 newest
 *     is RETAINED. a reader who takes the sentence above as two independent rules will expect it
 *     deleted (F18 combined semantics, settled by the user guide 2026-09-21)
 *   - ⚠️ `keep` requires a `Filter` element on the wire — aws returns `InvalidRequest` for a
 *     `NewerNoncurrentVersions` with no `<Filter>`. `putBucketLifecycle` sends `Filter: {Prefix:''}`
 *     unconditionally, so this holds today; a future edit that makes that Filter conditional
 *     would break every `keep` declaration (this is what settles A-10)
 */
export type VersionExpiry =
  | { after: IsoDurationInDays; keep: number | null }
  | { after: null; keep: number };

/**
 * .what = the versioning + noncurrent-version-expiry config for a bucket (aws
 *   Put/GetBucketVersioning + NoncurrentVersionExpiration)
 * .why = a backup store's durability: `status` turns versioning on; `expire` bounds the pile of
 *   noncurrent versions that on-ness would otherwise grow forever
 *
 * .note
 *   - the whole `versions` field is `false | DeclaredAwsS3BucketLifecycleVersions` on the bucket
 *     lifecycle — `false` = never-versioned, so `expire` is UNREACHABLE unless `status` is set
 *     (the wish's second failure mode, "versions on, expiry forgotten", cannot be typed — F16)
 *   - `status` is lowercase house words; the wire values are `Enabled`/`Suspended` (F16 sub-call 1)
 */
export interface DeclaredAwsS3BucketLifecycleVersions {
  /**
   * .what = whether object versioning is enabled or suspended
   * .note = maps to the aws wire values `Enabled` / `Suspended`
   */
  status: 'enabled' | 'suspended';

  /**
   * .what = how noncurrent versions expire (by age, count, or both); null = keep every version
   * .note = null = keep every noncurrent version forever (aws sends no NoncurrentVersionExpiration)
   */
  expire: VersionExpiry | null;
}

export class DeclaredAwsS3BucketLifecycleVersions
  extends DomainLiteral<DeclaredAwsS3BucketLifecycleVersions>
  implements DeclaredAwsS3BucketLifecycleVersions
{
  /**
   * .what = nested domain object definitions
   * .note = `expire` hydrates INTO the widened `DeclaredAwsS3BucketVersionExpiry` so it serializes
   *   cleanly, while the FIELD type above stays the `VersionExpiry` union — so the compile-time
   *   all-null-unrepresentable guarantee (F18, I-9) is preserved at the caller, not flattened
   */
  public static nested = {
    expire: DeclaredAwsS3BucketVersionExpiry,
  };
}
