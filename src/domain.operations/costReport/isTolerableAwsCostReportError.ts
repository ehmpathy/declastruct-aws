/**
 * .what = decides whether an aws cost-explorer error is in the read's tolerable
 *         allowlist — a legitimate "no data yet / already in flight" state the read
 *         degrades for, rather than a real failure to rethrow
 * .why = two cost-report reads degrade on an expected aws exception: the forecast read
 *        tolerates DataUnavailableException (a young account has no history to project),
 *        and the purchase-plan generation-start tolerates GenerationExistsException +
 *        DataUnavailableException (a generation already in flight, or too-little history).
 *        this is the shared ALLOWLIST boundary — an EXACT-name match (not startsWith), so
 *        an unrelated error whose name merely begins with a tolerable string is never
 *        masked. named + extracted so the degrade DECISION is unit-tested without a
 *        mocked client; every name outside the passed allowlist is NOT tolerable and the
 *        caller rethrows
 */
export const isTolerableAwsCostReportError = (input: {
  error: Error;
  tolerable: readonly string[];
}): boolean => input.tolerable.includes(input.error.name);
