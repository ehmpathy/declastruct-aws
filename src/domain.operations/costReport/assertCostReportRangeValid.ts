import { BadRequestError } from 'helpful-errors';
import type { IsoTimeStampRange } from 'iso-time';

/**
 * .what = asserts a cost-report range is well-formed — `until` strictly after `since`
 * .why = a reversed or empty range is a guaranteed AWS 400; the vision's edgecase table
 *        prescribes a fail-loud EARLY (before the billed cost-explorer request) so the
 *        caller learns of a bad range without a $0.01 cost to discover it
 * .note = ISO-8601 timestamps compare lexicographically in chronological order, so a
 *         plain string compare is a correct + deterministic range-order check
 */
export const assertCostReportRangeValid = (input: {
  range: IsoTimeStampRange;
}): void => {
  const { since, until } = input.range;
  if (until <= since)
    BadRequestError.throw(
      'cost report range is invalid: `until` must be strictly after `since`',
      { since, until },
    );
};
