import { DomainEntity, DomainLiteral } from 'domain-objects';
import type { IsoTimeStampRange } from 'iso-time';

import { DeclaredAwsCostAmount } from './DeclaredAwsCostAmount';
import { DeclaredAwsCostReportFilter } from './DeclaredAwsCostReportFilter';

/**
 * .what = one projected point of the forecast — mean + confidence band
 * .why = each point is a future window with its projected cost and the
 *        lower/upper bounds of the prediction interval
 * .note = money-shape divergence (deliberate): mean/lower/upper are bare decimal
 *         STRINGS with a SINGLE shared `unit`, NOT three DeclaredAwsCostAmount objects.
 *         all three bounds of one prediction interval share one currency (GetCostForecast
 *         returns a single Unit for the point), so a per-value { amount, unit } would
 *         triplicate the same unit across mean/lower/upper. the strings stay decimal
 *         (never bare number) — the money-precision invariant holds
 */
export interface DeclaredAwsCostReportSpendForecastPoint {
  /**
   * .what = the future time window this point covers
   */
  range: IsoTimeStampRange;

  /**
   * .what = the mean projected cost for the window (decimal string, unit below)
   */
  mean: string;

  /**
   * .what = the lower bound of the prediction interval (decimal string, unit below)
   */
  lower: string;

  /**
   * .what = the upper bound of the prediction interval (decimal string, unit below)
   */
  upper: string;

  /**
   * .what = the currency unit shared by mean/lower/upper
   * .example = 'USD'
   */
  unit: string;
}

export class DeclaredAwsCostReportSpendForecastPoint
  extends DomainLiteral<DeclaredAwsCostReportSpendForecastPoint>
  implements DeclaredAwsCostReportSpendForecastPoint
{
  public static nested = {
    range: DomainLiteral,
  };
}

/**
 * .what = a read-only report of PROJECTED spend over a future range
 * .why = answers "where is spend expected to go?" — a mean + confidence band,
 *        via GetCostForecast
 *
 * .identity
 *   - @unique = [range, granularity, metric, filter, predictionInterval]
 *   - no @primary — this is a computed/derived entity
 *
 * .note
 *   - read-only: getOne composite only, no set/del
 *   - amounts are decimal STRINGS (never bare number) — money precision
 *   - fails with DataUnavailable on an account with too little cost history (the read
 *     degrades to an empty forecast; see getOneCostReportSpendForecast)
 *   - STALENESS HAZARD: `range` is part of @unique, so it must be ABSOLUTE dates. a
 *     forecast declared for a fixed future window does NOT roll forward; a relative
 *     window that stays current is a disclosed wisher-gated fork (identity-vs-recency;
 *     see the vision + blocker doc). to keep a forecast current, hand-edit the dates
 */
export interface DeclaredAwsCostReportSpendForecast {
  /**
   * .what = the future time range (start must be >= today, end exclusive)
   * .note = part of @unique; must be ABSOLUTE dates — a hardcoded range freezes the
   *         forecast window (see the staleness-hazard note above)
   */
  range: IsoTimeStampRange;

  /**
   * .what = the projection granularity (DAILY <= 3mo, MONTHLY <= 18mo)
   * .note = part of @unique
   */
  granularity: 'DAILY' | 'MONTHLY';

  /**
   * .what = which cost metric to project — the AWS-native metric key
   * .example = 'UnblendedCost' | 'NetUnblendedCost' | 'AmortizedCost'
   * .note = part of @unique. GetCostForecast takes a single metric
   */
  metric: string;

  /**
   * .what = an optional predicate to scope the costs; null = whole account
   * .note = part of @unique
   */
  filter: DeclaredAwsCostReportFilter | null;

  /**
   * .what = the confidence level of the prediction interval (51-99)
   * .note = part of @unique. REQUIRED (no default) — the vision's testdrive called this
   *         "optional; default 80", but because it is part of @unique an implicit default
   *         would make the report's IDENTITY depend on a hidden value (two callers who
   *         omit it would silently share one identity, and a later default change would
   *         re-key every report). so it is a required, explicit field — a deliberate
   *         divergence from the vision's optional description
   */
  predictionInterval: number;

  /**
   * .what = the mean forecast total over the whole window
   * .note = @readonly — derived from AWS on read
   */
  total?: DeclaredAwsCostAmount;

  /**
   * .what = one point per time granule — mean + interval
   * .note = @readonly — derived from AWS on read
   */
  points?: DeclaredAwsCostReportSpendForecastPoint[];
}

export class DeclaredAwsCostReportSpendForecast
  extends DomainEntity<DeclaredAwsCostReportSpendForecast>
  implements DeclaredAwsCostReportSpendForecast
{
  // no primary — derived entity

  /**
   * .what = unique by the query that defines this forecast
   */
  public static unique = [
    'range',
    'granularity',
    'metric',
    'filter',
    'predictionInterval',
  ] as const;

  /**
   * .what = no metadata
   */
  public static metadata = [] as const;

  /**
   * .what = intrinsic attributes resolved from AWS, not user-settable
   */
  public static readonly = ['total', 'points'] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    range: DomainLiteral,
    filter: DeclaredAwsCostReportFilter,
    total: DeclaredAwsCostAmount,
    points: DeclaredAwsCostReportSpendForecastPoint,
  };
}
