import { BadRequestError } from 'helpful-errors';
import type { IsoTimeStampRange } from 'iso-time';

/**
 * .what = the AWS-documented forecast horizon caps, in whole months, per granularity
 * .why = GetCostForecast caps a DAILY horizon at 3 months and a MONTHLY horizon at 18
 *        months; a range beyond the cap is a guaranteed AWS 400
 */
const FORECAST_HORIZON_CAP_MONTHS: Record<'DAILY' | 'MONTHLY', number> = {
  DAILY: 3,
  MONTHLY: 18,
};

/**
 * .what = the whole-month span between two 'YYYY-MM-DD' date parts
 * .why = AWS measures the forecast horizon in calendar months; a whole-month delta
 *        (year*12 + month) is the deterministic month count, free of day/leap drift
 */
const asWholeMonthSpan = (input: { since: string; until: string }): number => {
  // parse the 'YYYY' and 'MM' parts by fixed offset (avoids split-index undefined)
  const sinceYear = Number(input.since.slice(0, 4));
  const sinceMonth = Number(input.since.slice(5, 7));
  const untilYear = Number(input.until.slice(0, 4));
  const untilMonth = Number(input.until.slice(5, 7));
  return (untilYear - sinceYear) * 12 + (untilMonth - sinceMonth);
};

/**
 * .what = asserts a forecast horizon is within the AWS cap for its granularity
 * .why = the vision's edgecase table prescribes a fail-loud EARLY (before the billed
 *        request) so an over-long horizon is caught without a $0.01 cost to discover it
 * .note = a coarse whole-month guard; AWS remains authoritative on the exact boundary
 */
export const assertForecastHorizonValid = (input: {
  range: IsoTimeStampRange;
  granularity: 'DAILY' | 'MONTHLY';
}): void => {
  const cap = FORECAST_HORIZON_CAP_MONTHS[input.granularity];
  const span = asWholeMonthSpan({
    since: input.range.since,
    until: input.range.until,
  });
  if (span > cap)
    BadRequestError.throw(
      'forecast horizon is invalid: exceeds the AWS cap for its granularity',
      {
        granularity: input.granularity,
        capMonths: cap,
        spanMonths: span,
        since: input.range.since,
        until: input.range.until,
      },
    );
};
