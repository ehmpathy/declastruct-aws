import type { UniDateTimeRange } from '@ehmpathy/uni-time';
import { DomainEntity, DomainLiteral } from 'domain-objects';
import type { PickOne } from 'type-fns';

/**
 * .what = a filter to select log groups by prefix or explicit names
 */
export type DeclaredAwsLogGroupFilter = PickOne<{
  /**
   * .what = the log group name prefix to filter by
   * .example = '/aws/lambda/' to get all lambda log groups
   */
  prefix: string;

  /**
   * .what = explicit list of log group names
   */
  names: string[];
}>;

/**
 * .what = a single row of log group ingestion cost data
 */
export interface DeclaredAwsLogGroupReportCostOfIngestionRow {
  /**
   * .what = the log group name
   */
  logGroupName: string;

  /**
   * .what = bytes ingested during the time range
   */
  ingestedBytes: number;

  /**
   * .what = number of log events ingested
   */
  logEvents: number;

  /**
   * .what = estimated cost in USD
   * .note = calculated as ingestedBytes * $0.50/GB
   */
  estimatedCostUsd: number;

  /**
   * .what = percentage of total (by bytes and events)
   */
  percentOfTotal: {
    /**
     * .what = percentage of total ingested bytes
     */
    bytes: number;

    /**
     * .what = percentage of total log events
     */
    events: number;
  };
}

export class DeclaredAwsLogGroupReportCostOfIngestionRow
  extends DomainLiteral<DeclaredAwsLogGroupReportCostOfIngestionRow>
  implements DeclaredAwsLogGroupReportCostOfIngestionRow
{
  public static nested = {
    percentOfTotal: DomainLiteral,
  };
}

/**
 * .what = aggregated ingestion cost report for log groups over a time range
 * .why = enables declarative understanding of CloudWatch Logs costs
 *
 * .identity
 *   - @unique = [logGroupFilter, range] — defined by query parameters
 *   - no @primary — this is a computed/derived entity
 *
 * .note
 *   - uses CloudWatch Metrics (AWS/Logs namespace, IncomingBytes metric)
 *   - cost calculation: ingestedBytes * $0.50/GB (varies by region)
 */
export interface DeclaredAwsLogGroupReportCostOfIngestion {
  /**
   * .what = filter to select which log groups to include
   * .note = part of @unique
   */
  logGroupFilter: DeclaredAwsLogGroupFilter;

  /**
   * .what = the time range for the cost report
   * .note = part of @unique
   */
  range: UniDateTimeRange;

  /**
   * .what = total bytes ingested across all log groups
   * .note = @readonly
   */
  totalIngestedBytes?: number;

  /**
   * .what = total log events ingested
   * .note = @readonly
   */
  totalLogEvents?: number;

  /**
   * .what = total estimated cost in USD
   * .note = @readonly — uses $0.50/GB ingestion rate
   */
  totalEstimatedCostUsd?: number;

  /**
   * .what = the cost rows per log group, sorted by ingested bytes descending
   * .note = @readonly — computed from CloudWatch Metrics
   */
  rows?: DeclaredAwsLogGroupReportCostOfIngestionRow[];
}

export class DeclaredAwsLogGroupReportCostOfIngestion
  extends DomainEntity<DeclaredAwsLogGroupReportCostOfIngestion>
  implements DeclaredAwsLogGroupReportCostOfIngestion
{
  // no primary — derived entity

  /**
   * .what = unique by filter and range
   */
  public static unique = ['logGroupFilter', 'range'] as const;

  /**
   * .what = no metadata
   */
  public static metadata = [] as const;

  /**
   * .what = intrinsic attributes resolved from AWS, not user-settable
   */
  public static readonly = [
    'rows',
    'totalIngestedBytes',
    'totalLogEvents',
    'totalEstimatedCostUsd',
  ] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    logGroupFilter: DomainLiteral,
    range: DomainLiteral,
    rows: DeclaredAwsLogGroupReportCostOfIngestionRow,
  };
}
