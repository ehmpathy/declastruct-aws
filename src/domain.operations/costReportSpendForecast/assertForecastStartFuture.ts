import { BadRequestError } from 'helpful-errors';
import type { IsoTimeStampRange } from 'iso-time';

/**
 * .what = asserts a forecast range starts today or later
 * .why = GetCostForecast rejects a `Start` before today; the vision's edgecase table
 *        prescribes a fail-loud EARLY (before the billed request) so the caller learns
 *        of a past start without a $0.01 cost to discover it
 * .note = AWS compares calendar DATES (not timestamps), so this compares the
 *         'YYYY-MM-DD' date part; `now` is injectable for deterministic tests
 */
export const assertForecastStartFuture = (input: {
  range: IsoTimeStampRange;
  now?: string;
}): void => {
  const startDate = input.range.since.slice(0, 10);
  const todayDate = (input.now ?? new Date().toISOString()).slice(0, 10);
  if (startDate < todayDate)
    BadRequestError.throw(
      'forecast range is invalid: `since` must be today or later — GetCostForecast rejects a past start',
      { since: input.range.since, today: todayDate },
    );
};
