/**
 * .what = decides whether an aws error from a GetCostAndUsageWithResources read is the
 *         "resource-level data opt-in is off" signal
 * .why = the resource-level opt-in signals its off-state EXACTLY like the rightsize opt-in:
 *        AWS throws an `AccessDeniedException` whose MESSAGE names this precise condition —
 *        "resource-level data granularity" + "opt-in only feature". a bare name-match on
 *        AccessDeniedException would MASK real iam denials as "feature off" (a failhide), so
 *        we match the distinctive MESSAGE pair instead, scoped to this api's call sites
 * .note = the live signal is an AccessDeniedException MESSAGE, NOT a `DataUnavailableException`
 *         NAME. an earlier version matched the name on an unverified assumption and missed the
 *         real signal — so the probe rethrew at plan instead of a guide at apply. verify the
 *         real aws signal; do not assume it (see the forbid-plan-on-prereq brief)
 * .note = SCOPE: only call this on an error from GetCostAndUsageWithResources. a genuine
 *         `DataUnavailableException` on OTHER cost apis (forecast + rightsize) reads as
 *         "enabled but empty" — a TOLERABLE degrade, not "off". the semantics are per-api, so
 *         this detector must not be reused across apis
 */
export const isResourceLevelDataOptInDisabledError = (input: {
  error: unknown;
}): boolean => {
  if (!(input.error instanceof Error)) return false;
  const { message } = input.error;

  // both phrases must be present — the resource-level condition AND the opt-in nature — so
  // an unrelated "opt-in" message or a real identity-policy denial can never trip this
  const namesResourceLevelData = /resource-level data granularity/i.test(
    message,
  );
  const isOptInOnly = /opt-in only feature/i.test(message);
  return namesResourceLevelData && isOptInOnly;
};
