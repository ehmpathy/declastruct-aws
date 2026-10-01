import type { S3BucketLifecycleParams } from '@src/domain.objects/S3BucketLifecycleParams';

/**
 * .what = a transition list as SORTED comparable keys, so two lists compare as sets
 * .why = it removes an order assumption from the predicate below — see its second `.note`
 */
const asTransitionKeys = (
  transitions: S3BucketLifecycleParams['transitions'],
): string[] =>
  transitions.map((each) => `${each.afterDays}:${each.class}`).sort();

/**
 * .what = whether a live lifecycle read matches the desired params on EVERY axis
 * .why = the stability-poll predicate — a matched read must agree on transitions count, object
 *   expiry, BOTH version-expiry axes, and multipart expiry, so a keep-only change is not satisfied by
 *   a NoncurrentDays read alone (case=5 [t5c]). extracted pure so the poll loop reads as narrative
 *
 * .note = both operands take the SAME `S3BucketLifecycleParams`, deliberately. a predicate that
 *   compared a read-shaped type against a write-shaped one could go stale on an axis present in only
 *   one of them — and a stability predicate that matches too early is the F6 defect
 *
 * .note = transitions are compared as a SET, never positionally. a positional compare would assume
 *   aws replays the declared order on read-back — an assumption this wish has NOT verified, and one
 *   whose failure is expensive in an unobvious way: the predicate would never match, so the poll
 *   would burn to its 60s deadline and throw a convergence error on a bucket that had in fact
 *   converged. an order-insensitive compare needs no assumption at all, which is why it is taken
 *   over a `.note` that merely records one (rule.prefer.prevent-over-correct, rung 1 over rung 4)
 */
export const doesS3BucketLifecycleReadMatchDesired = (input: {
  live: S3BucketLifecycleParams | null;
  desired: S3BucketLifecycleParams;
}): boolean => {
  const { live, desired } = input;
  if (live == null) return false;

  const liveTransitions = asTransitionKeys(live.transitions);
  const desiredTransitions = asTransitionKeys(desired.transitions);

  return (
    liveTransitions.length === desiredTransitions.length &&
    liveTransitions.every((key, index) => key === desiredTransitions[index]) &&
    live.objectExpireDays === desired.objectExpireDays &&
    live.multipartExpireDays === desired.multipartExpireDays &&
    (live.versionExpiry?.afterDays ?? null) ===
      (desired.versionExpiry?.afterDays ?? null) &&
    (live.versionExpiry?.keep ?? null) === (desired.versionExpiry?.keep ?? null)
  );
};
