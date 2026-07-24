import { asIsoTimeStamp } from 'iso-time';

/**
 * .what = the UTC day-start IsoTimeStamp for a date shifted by `addDays` from now
 * .why = the forecast window must always start today-or-later (GetCostForecast rejects
 *        a past `since`); a value derived off the current day at load time keeps the
 *        fixture valid on every run, unlike a hardcoded date that goes stale within 24h
 */
const asUtcDayStartStamp = (input: { addDays: number }): string => {
  // derive a fresh Date via Date.UTC arithmetic (no in-place mutation): JS normalizes
  // a day overflow across month/year, so `getUTCDate() + addDays` is safe
  const now = new Date();
  const shifted = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + input.addDays,
    ),
  );
  return `${shifted.toISOString().slice(0, 10)}T00:00:00.000Z`;
};

/**
 * .what = the cost-report ranges shared by the acceptance wish + its test
 * .why = the wish (`resources.acceptance.ts`) declares the reports and the test
 *   (`declastruct.acceptance.test.ts`) reads them back via DAO for the masked-snapshot
 *   assertion — both MUST use the same @unique identity or the read hits a different
 *   report. one exported const, imported by both, so the two can never desync (they were
 *   previously re-typed in each file with only a comment to keep them aligned)
 * .note on the OBSERVED range = a fixed PAST month; a past range stays valid forever
 *   (GetCostAndUsage accepts any settled window), so no drift here.
 * .note on the FORECAST range = derived off the current UTC day at load time so `since`
 *   is always today-or-later. a hardcoded future date would fall into the past within a
 *   day and trip `assertForecastStartFuture` — the drift the fixed-date form left primed.
 *   this is an ACCEPTANCE fixture (declared + read within one run), so it needs no stable
 *   cross-day KEEP identity; the masked snapshot masks the dates, so the dynamic window
 *   does not churn the snapshot. the user-visible symbolic-relative-range is wisher-gated.
 */
export const COST_REPORT_OBSERVED_RANGE = {
  since: asIsoTimeStamp('2026-06-01T00:00:00.000Z'),
  until: asIsoTimeStamp('2026-07-01T00:00:00.000Z'),
};

export const COST_REPORT_FORECAST_RANGE = {
  since: asIsoTimeStamp(asUtcDayStartStamp({ addDays: 0 })),
  until: asIsoTimeStamp(asUtcDayStartStamp({ addDays: 30 })),
};

/**
 * .what = the by-RESOURCE_ID report range — the last 13 days, derived off the current UTC
 *   day at load time
 * .why = resource-level data is retained only ~14 days, so a FIXED past range would fall
 *   outside the retention window and trip `assertResourceLevelRangeWithinRetention` within
 *   days (the same drift the forecast's fixed-date form left primed). a `since` derived off
 *   `now` stays always inside the window. like the forecast, this is an acceptance fixture
 *   (declared + read within one run), so it needs no stable cross-day KEEP identity; the
 *   masked snapshot masks the dates, so the dynamic window does not churn the snapshot
 */
export const COST_REPORT_BY_RESOURCE_RANGE = {
  since: asIsoTimeStamp(asUtcDayStartStamp({ addDays: -13 })),
  until: asIsoTimeStamp(asUtcDayStartStamp({ addDays: 0 })),
};
