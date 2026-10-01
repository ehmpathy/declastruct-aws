import { assertS3BucketLifecycleActionful } from '@src/domain.objects/assertS3BucketLifecycleActionful';
import type { DeclaredAwsS3BucketLifecycle } from '@src/domain.objects/DeclaredAwsS3BucketLifecycle';
import type { S3BucketLifecycleParams } from '@src/domain.objects/S3BucketLifecycleParams';

import { asS3BucketLifecycleParams } from './asS3BucketLifecycleParams';
import { hasS3BucketLifecycleRuleAction } from './hasS3BucketLifecycleRuleAction';

/**
 * .what = the lifecycle rule params to PUT, or `null` to retract the rule entirely
 * .why = THREE distinct declarations converge on the same remote effect — no lifecycle rule on
 *   the bucket — and each one used to reach that effect down its own code path:
 *     1. `lifecycle: null` — the consumer wants no rule at all (the documented *persist* mode)
 *     2. `lifecycle: { versions: {...}, objects/multiparts empty }` — a version-state-only
 *        lifecycle, whose content is written by `PutBucketVersioning` rather than by a rule
 *     3. a lifecycle whose params carry no RULE action for any other reason
 *
 *   ⚠️ aws REJECTS an actionless rule, so 2 and 3 cannot be written as an empty rule — they must
 *   be written as a retract, exactly as 1 is. before this cast, 1 and 2 each had their own
 *   `retractS3BucketLifecycle` call site with a byte-identical argument bag, so a later edit to
 *   one site's knobs (or a fourth reason added to only one) would drift them apart silently.
 *
 * .note = the return is keyed on the EFFECT the three share (no rule on the bucket, converged),
 *   never on the reason any of them reached it. that is what lets one call site serve all three.
 *
 * ⚠️ this cast THROWS on a fully-actionless lifecycle object — every sub-key empty — and names
 *   `lifecycle: null` as the fix (case=8 / I-6). a caller must therefore invoke it at the point
 *   in the write sequence where that rejection is safe: `setS3Bucket` calls it AFTER
 *   `createBucket`, which is idempotent, so a reject leaves an empty bucket that a retry adopts.
 */
export const asS3BucketLifecycleRuleToWrite = (input: {
  lifecycle: DeclaredAwsS3BucketLifecycle | null;
}): S3BucketLifecycleParams | null => {
  const { lifecycle } = input;

  // reason 1: no lifecycle declared at all — retract
  if (!lifecycle) return null;

  // case=8 / I-6: a lifecycle object with every sub-key empty is a caller defect, not a retract.
  // the consumer who wants no rule has an idiom for it already, and this names it
  assertS3BucketLifecycleActionful({ lifecycle });

  const params = asS3BucketLifecycleParams({ lifecycle });

  // reasons 2 and 3: real content, but none of it belongs to a RULE — retract
  if (!hasS3BucketLifecycleRuleAction(params)) return null;

  return params;
};
