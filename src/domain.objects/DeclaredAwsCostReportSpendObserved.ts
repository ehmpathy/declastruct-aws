import { DomainEntity, DomainLiteral } from 'domain-objects';
import type { IsoTimeStampRange } from 'iso-time';
import type { PickOne } from 'type-fns';

import { DeclaredAwsCostAmount } from './DeclaredAwsCostAmount';
import { DeclaredAwsCostReportFilter } from './DeclaredAwsCostReportFilter';

/**
 * .what = how to slice the spend — by an AWS dimension or a cost-allocation tag
 * .why = one group-by axis per report keeps the report's identity and mental model
 *        simple (spend by service, or spend by tag); the two-level group-by the
 *        api also supports is a disclosed v1 narrow (see vision)
 */
export type DeclaredAwsCostReportSpendObservedGroupBy = PickOne<{
  /**
   * .what = an AWS dimension to group by
   * .example = 'SERVICE' | 'LINKED_ACCOUNT' | 'USAGE_TYPE'
   */
  dimension: string;

  /**
   * .what = a cost-allocation tag key to group by
   * .example = 'env'
   */
  tag: string;
}>;

/**
 * .what = the composition of spend within a single time bucket
 * .why = each group is one slice (e.g. one service) and its cost for the bucket
 */
export interface DeclaredAwsCostReportSpendObservedGroup {
  /**
   * .what = the group key values (e.g. the service name)
   */
  keys: string[];

  /**
   * .what = the cost attributed to this group within the bucket
   */
  cost: DeclaredAwsCostAmount;
}

export class DeclaredAwsCostReportSpendObservedGroup
  extends DomainLiteral<DeclaredAwsCostReportSpendObservedGroup>
  implements DeclaredAwsCostReportSpendObservedGroup
{
  public static nested = {
    cost: DeclaredAwsCostAmount,
  };
}

/**
 * .what = one time granule of the report — the trend axis
 * .why = each bucket carries the total for its window AND the group composition
 */
export interface DeclaredAwsCostReportSpendObservedBucket {
  /**
   * .what = the time window this bucket covers
   */
  range: IsoTimeStampRange;

  /**
   * .what = the total cost across all groups in this bucket
   */
  total: DeclaredAwsCostAmount;

  /**
   * .what = whether AWS flagged this bucket as an ESTIMATE (not yet settled)
   * .why = CE data lags actual usage by ~24-48h; a bucket that includes "today"
   *        reads partial + not-yet-final. this flag lets a reader tell a fresh
   *        number from a settled one, rather than trust an estimate as final
   */
  estimated: boolean;

  /**
   * .what = the per-group composition within this bucket
   */
  groups: DeclaredAwsCostReportSpendObservedGroup[];
}

export class DeclaredAwsCostReportSpendObservedBucket
  extends DomainLiteral<DeclaredAwsCostReportSpendObservedBucket>
  implements DeclaredAwsCostReportSpendObservedBucket
{
  public static nested = {
    range: DomainLiteral,
    total: DeclaredAwsCostAmount,
    groups: DeclaredAwsCostReportSpendObservedGroup,
  };
}

/**
 * .what = a read-only report of OBSERVED spend over a past range, sliced + trended
 * .why = answers "where does our budget go?" — one read returns both the
 *        composition (groups) and the trend (buckets), via GetCostAndUsage
 *
 * .identity
 *   - @unique = [range, granularity, groupBy, filter, metric] — the query
 *   - no @primary — this is a computed/derived entity
 *
 * .note
 *   - read-only: getOne composite only, no set/del (a report is read, never applied)
 *   - amounts are decimal STRINGS (never bare number) — money precision
 *   - STALENESS HAZARD: `range` is part of @unique, so it must be ABSOLUTE dates. a
 *     report declared for "this month" with hardcoded dates is frozen to that month
 *     forever — it does NOT roll forward, and a re-plan reads the SAME (now past)
 *     window, not the current one. a relative range ("last 30 days") that stays
 *     current is a disclosed wisher-gated design fork (identity-vs-recency; see the
 *     vision + blocker doc). until then: to keep a report current, hand-edit the dates
 */
export interface DeclaredAwsCostReportSpendObserved {
  /**
   * .what = the past time range the report covers (start inclusive, end exclusive)
   * .note = part of @unique; must be ABSOLUTE dates — a hardcoded range freezes the
   *         report to that window (see the staleness-hazard note above)
   */
  range: IsoTimeStampRange;

  /**
   * .what = the trend-bucket granularity
   * .note = part of @unique
   */
  granularity: 'DAILY' | 'MONTHLY';

  /**
   * .what = how to slice the spend (dimension or tag)
   * .note = part of @unique
   */
  groupBy: DeclaredAwsCostReportSpendObservedGroupBy;

  /**
   * .what = an optional predicate to scope the costs; null = whole account
   * .note = part of @unique
   */
  filter: DeclaredAwsCostReportFilter | null;

  /**
   * .what = which cost metric to sum — the AWS-native metric key
   * .example = 'UnblendedCost' (gross) | 'NetUnblendedCost' (net of credits) |
   *            'AmortizedCost' | 'NetAmortizedCost' | 'BlendedCost'
   * .note = part of @unique. kept as the AWS key so the response can be indexed
   *         by it directly (no translation map)
   */
  metric: string;

  /**
   * .what = the total cost across all buckets
   * .note = @readonly — derived from AWS on read
   */
  total?: DeclaredAwsCostAmount;

  /**
   * .what = one bucket per time granule — the trend + composition
   * .note = @readonly — derived from AWS on read
   */
  buckets?: DeclaredAwsCostReportSpendObservedBucket[];
}

export class DeclaredAwsCostReportSpendObserved
  extends DomainEntity<DeclaredAwsCostReportSpendObserved>
  implements DeclaredAwsCostReportSpendObserved
{
  // no primary — derived entity

  /**
   * .what = unique by the query that defines this report
   */
  public static unique = [
    'range',
    'granularity',
    'groupBy',
    'filter',
    'metric',
  ] as const;

  /**
   * .what = no metadata
   */
  public static metadata = [] as const;

  /**
   * .what = intrinsic attributes resolved from AWS, not user-settable
   */
  public static readonly = ['total', 'buckets'] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    range: DomainLiteral,
    groupBy: DomainLiteral,
    filter: DeclaredAwsCostReportFilter,
    total: DeclaredAwsCostAmount,
    buckets: DeclaredAwsCostReportSpendObservedBucket,
  };
}
