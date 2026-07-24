/**
 * .what = decides whether an aws error is the SPECIFIC "rightsize recommendation is
 *         opt-in only" signal — the console-only preference is off — as opposed to a
 *         generic iam denial
 * .why = the rightsize recommendation read throws a plain `AccessDeniedException` (an
 *        overloaded error NAME) when the payer account has not opted into rightsize
 *        recommendations. a bare name-match would MASK real iam denials as "feature off"
 *        (a failhide). so we match on the MESSAGE signature AWS uses for this exact
 *        condition — "opt-in only feature" + "Cost Explorer Preferences" — which is
 *        distinct from an identity-policy denial ("not authorized to perform"). only that
 *        precise pair is treated as "the preference is off"; every other error is NOT
 * .note = mirrors getCostManagementGuidanceError's message-signal approach (aws exposes
 *         no structured code for this), scoped to the rightsize opt-in
 */
export const isRightsizeOptInDisabledError = (input: {
  error: unknown;
}): boolean => {
  if (!(input.error instanceof Error)) return false;
  const { message } = input.error;

  // both phrases must be present — the opt-in nature AND the CE preferences location —
  // so an unrelated "opt-in" or "preferences" message can never trip this
  const isOptInOnly = /opt-in only feature/i.test(message);
  const namesCePreferences = /cost explorer preferences/i.test(message);
  return isOptInOnly && namesCePreferences;
};
