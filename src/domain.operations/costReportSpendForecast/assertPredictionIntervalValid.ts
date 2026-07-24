import { BadRequestError } from 'helpful-errors';

/**
 * .what = asserts a forecast prediction-interval is within AWS's accepted 51–99 band
 * .why = GetCostForecast rejects a PredictionIntervalLevel outside 51–99 with a 400; the
 *        vision's edgecase table prescribes a fail-loud EARLY (before the billed
 *        cost-explorer request) so the caller learns of a bad interval without a $0.01
 *        cost to discover it. extracted as a pure guard — like assertCostReportRangeValid
 *        — so its fail-loud path is unit-testable without a live read
 */
export const assertPredictionIntervalValid = (input: {
  predictionInterval: number;
}): void => {
  const { predictionInterval } = input;
  if (predictionInterval < 51 || predictionInterval > 99)
    BadRequestError.throw(
      'forecast prediction interval is invalid: `predictionInterval` must be between 51 and 99 (inclusive)',
      { predictionInterval },
    );
};
