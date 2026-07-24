import { BadRequestError } from 'helpful-errors';
import type { IsoTimeStampRange } from 'iso-time';

/**
 * .what = the recent window (days) for which AWS retains resource-level cost data
 * .why = GetCostAndUsageWithResources only serves the last ~14 days of resource-level
 *        detail (a documented retention cap); a `since` older than that is a guaranteed
 *        400. exported so the guard and its test share ONE source of truth
 */
export const RESOURCE_LEVEL_RETENTION_DAYS = 14;

/**
 * .what = asserts a by-resource report range starts within the ~14-day retention window
 * .why = resource-level data is retained only for the last ~14 days; a `since` older
 *        than that is rejected by AWS. per the pit-of-success pattern, fail loud EARLY
 *        (before the billed request) with the retention cap named, so the caller learns
 *        without a $0.01 cost to discover it
 * .note = a small clock-skew grace is NOT applied — AWS is strict on the boundary, so we
 *         mirror its cutoff exactly; a range that starts on the boundary day is accepted
 */
export const assertResourceLevelRangeWithinRetention = (input: {
  range: IsoTimeStampRange;
  now?: Date;
}): void => {
  const now = input.now ?? new Date();
  const cutoff = new Date(
    now.getTime() - RESOURCE_LEVEL_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  const cutoffStamp = cutoff.toISOString();

  // compare lexicographically — ISO-8601 timestamps sort in chronological order
  if (String(input.range.since) < cutoffStamp)
    BadRequestError.throw(
      `by-resource report range starts before the resource-level retention window (~${RESOURCE_LEVEL_RETENTION_DAYS} days). AWS retains per-resource cost detail only for the last ~${RESOURCE_LEVEL_RETENTION_DAYS} days; choose a \`since\` on or after the cutoff`,
      {
        since: input.range.since,
        cutoff: cutoffStamp,
        retentionDays: RESOURCE_LEVEL_RETENTION_DAYS,
      },
    );
};
