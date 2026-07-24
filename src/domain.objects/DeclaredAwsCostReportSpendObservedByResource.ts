import { DomainEntity, DomainLiteral } from 'domain-objects';
import type { IsoTimeStampRange } from 'iso-time';

import { DeclaredAwsCostAmount } from './DeclaredAwsCostAmount';
import { DeclaredAwsCostReportFilter } from './DeclaredAwsCostReportFilter';

/**
 * .what = the per-resource composition of spend within a single time bucket
 * .why = each group is ONE resource (its `keys` carry the resource id, e.g. an EC2
 *        instance id) and its cost for the bucket
 */
export interface DeclaredAwsCostReportSpendObservedByResourceGroup {
  /**
   * .what = the group key values — for a RESOURCE_ID group, the single resource id
   * .example = ['i-0abc123…']
   */
  keys: string[];

  /**
   * .what = the cost attributed to this resource within the bucket
   */
  cost: DeclaredAwsCostAmount;
}

export class DeclaredAwsCostReportSpendObservedByResourceGroup
  extends DomainLiteral<DeclaredAwsCostReportSpendObservedByResourceGroup>
  implements DeclaredAwsCostReportSpendObservedByResourceGroup
{
  public static nested = {
    cost: DeclaredAwsCostAmount,
  };
}

/**
 * .what = one time granule of the report — the trend axis, with per-resource composition
 * .why = each bucket carries the total for its window AND the per-resource breakdown
 */
export interface DeclaredAwsCostReportSpendObservedByResourceBucket {
  /**
   * .what = the time window this bucket covers
   */
  range: IsoTimeStampRange;

  /**
   * .what = the total cost across all resources in this bucket
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
   * .what = the per-resource composition within this bucket (one group per resource id)
   */
  groups: DeclaredAwsCostReportSpendObservedByResourceGroup[];
}

export class DeclaredAwsCostReportSpendObservedByResourceBucket
  extends DomainLiteral<DeclaredAwsCostReportSpendObservedByResourceBucket>
  implements DeclaredAwsCostReportSpendObservedByResourceBucket
{
  public static nested = {
    range: DomainLiteral,
    total: DeclaredAwsCostAmount,
    groups: DeclaredAwsCostReportSpendObservedByResourceGroup,
  };
}

/**
 * .what = a read-only report of OBSERVED spend broken down by RESOURCE_ID — the exact
 *         per-resource (e.g. per-EC2-instance) dollar breakdown, over a past range
 * .why = the SpendObserved twin, but grouped by resource id instead of a dimension/tag.
 *        it answers "which exact instance cost what?" via GetCostAndUsageWithResources.
 *        unlike the inferred CloudWatch log-group reports, this needs NO price math — Cost
 *        Explorer IS the bill, so the dollar per resource is native + exact
 *
 * .identity
 *   - @unique = [range, granularity, filter, metric] — the query. NO groupBy field:
 *     this report is ALWAYS grouped by RESOURCE_ID (that is what makes it "byResource")
 *   - no @primary — this is a computed/derived entity
 *
 * .note
 *   - read-only: getOne composite only, no set/del (a report is read, never applied)
 *   - amounts are decimal STRINGS (never bare number) — money precision
 *   - REQUIRED filter: GetCostAndUsageWithResources REQUIRES a filter and (for cost data)
 *     that it pin `SERVICE` to a single service. so `filter` is NON-null here, unlike the
 *     nullable filter on the plain SpendObserved report
 *   - PRECONDITION: the "resource-level data at daily granularity" opt-in (a FREE console
 *     preference; only the separate HOURLY tier is paid) must be on, or the read yields no
 *     rows. declare DeclaredAwsCostExplorerPreference (feature=resourceLevelData) to make
 *     that precondition explicit
 *   - 14-DAY WINDOW CAP: resource-level data is retained ~14 days only; a wider range is
 *     rejected. the read guards this before the billed request
 *   - STALENESS HAZARD: `range` is part of @unique, so it must be ABSOLUTE dates (same
 *     identity-vs-recency fork as the plain SpendObserved report)
 */
export interface DeclaredAwsCostReportSpendObservedByResource {
  /**
   * .what = the past time range the report covers (start inclusive, end exclusive)
   * .note = part of @unique; must be ABSOLUTE dates AND within the ~14-day retention cap
   */
  range: IsoTimeStampRange;

  /**
   * .what = the trend-bucket granularity
   * .note = part of @unique. HOURLY is EC2-only + costs more records; DAILY is the norm
   */
  granularity: 'DAILY' | 'MONTHLY';

  /**
   * .what = the predicate that scopes the costs — REQUIRED (must pin a single SERVICE)
   * .note = part of @unique. non-null: GetCostAndUsageWithResources requires a filter
   * .example = { dimension: 'SERVICE', values: ['Amazon Elastic Compute Cloud - Compute'] }
   */
  filter: DeclaredAwsCostReportFilter;

  /**
   * .what = which cost metric to sum — the AWS-native metric key
   * .example = 'UnblendedCost' (gross) | 'NetUnblendedCost' (net of credits)
   * .note = part of @unique
   */
  metric: string;

  /**
   * .what = the total cost across all buckets
   * .note = @readonly — derived from AWS on read
   */
  total?: DeclaredAwsCostAmount;

  /**
   * .what = one bucket per time granule — the trend + per-resource composition
   * .note = @readonly — derived from AWS on read
   */
  buckets?: DeclaredAwsCostReportSpendObservedByResourceBucket[];
}

export class DeclaredAwsCostReportSpendObservedByResource
  extends DomainEntity<DeclaredAwsCostReportSpendObservedByResource>
  implements DeclaredAwsCostReportSpendObservedByResource
{
  // no primary — derived entity

  /**
   * .what = unique by the query that defines this report (RESOURCE_ID group is intrinsic)
   */
  public static unique = ['range', 'granularity', 'filter', 'metric'] as const;

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
    filter: DeclaredAwsCostReportFilter,
    total: DeclaredAwsCostAmount,
    buckets: DeclaredAwsCostReportSpendObservedByResourceBucket,
  };
}
