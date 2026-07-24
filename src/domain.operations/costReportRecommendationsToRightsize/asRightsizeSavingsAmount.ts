import type { RightsizingRecommendation } from '@aws-sdk/client-cost-explorer';

/**
 * .what = derives the estimated-monthly-savings amount (a decimal string) for one
 *         AWS rightsize recommendation, per its action; null when the rec's shape is
 *         anomalous and the savings cannot be read
 * .why = a TERMINATE rec carries its savings on TerminateRecommendationDetail; a MODIFY
 *        rec carries it on the DEFAULT target instance. these read via a find + a branch
 *        (decode-friction). a MODIFY whose default target cannot be read must NOT silently
 *        report zero savings (that would MASK real recommendation data behind a false "no
 *        savings", a failhide). but it must ALSO NOT throw: this transformer feeds a
 *        `getOneCostReport*` read that declastruct calls inside a per-resource-less plan
 *        loop, so a throw here aborts the ENTIRE shared plan (blast radius). so an
 *        unreadable savings degrades to `null` — a distinct sentinel the caller surfaces
 *        as "savings unknown" (not a false zero) and logs loud, never a throw, never a mask
 * .note = the caller (castInto... + the getOne composite) is responsible for the loud log
 *         per null result, so the degrade is observable; see the domain object's
 *         estimatedMonthlySavings .why
 */
export const asRightsizeSavingsAmount = (input: {
  rec: RightsizingRecommendation;
}): string | null => {
  const { rec } = input;

  // a TERMINATE rec's savings ride on TerminateRecommendationDetail
  if (rec.RightsizingType === 'TERMINATE')
    return rec.TerminateRecommendationDetail?.EstimatedMonthlySavings ?? null;

  // a MODIFY rec's savings ride on the DEFAULT target instance
  const targets = rec.ModifyRecommendationDetail?.TargetInstances ?? [];
  const targetDefault = targets.find((target) => target.DefaultTargetInstance);

  // no target instances at all → a MODIFY with no target to modify is a shape anomaly
  if (targets.length === 0) return null;

  // targets present but none flagged default → cannot read the savings; degrade to the
  // null sentinel rather than a silent zero (mask) or a throw (aborts the whole plan)
  if (!targetDefault) return null;

  return targetDefault.EstimatedMonthlySavings ?? null;
};
