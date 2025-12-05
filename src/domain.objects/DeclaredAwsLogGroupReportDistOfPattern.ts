import { UniDateTimeRange } from '@ehmpathy/uni-time';
import { DomainEntity, DomainLiteral, RefByUnique } from 'domain-objects';

import { DeclaredAwsLogGroup } from './DeclaredAwsLogGroup';

/**
 * .what = a single row in a pattern distribution report
 */
export interface DeclaredAwsLogGroupReportDistOfPatternRow {
  /**
   * .what = the pattern value
   * .note = the actual value of the pattern field (e.g., the message content)
   */
  value: string;

  /**
   * .what = how many times this pattern value appeared
   */
  frequency: number;

  /**
   * .what = total bytes for all occurrences of this pattern value
   */
  totalBytes: number;

  /**
   * .what = average size in bytes per occurrence
   */
  avgBytes: number;

  /**
   * .what = percentage of total (by frequency and bytes)
   */
  percentOfTotal: {
    /**
     * .what = percentage of total log events by frequency
     */
    frequency: number;

    /**
     * .what = percentage of total bytes
     */
    bytes: number;
  };
}

export class DeclaredAwsLogGroupReportDistOfPatternRow
  extends DomainLiteral<DeclaredAwsLogGroupReportDistOfPatternRow>
  implements DeclaredAwsLogGroupReportDistOfPatternRow
{
  public static nested = {
    percentOfTotal: DomainLiteral,
  };
}

/**
 * .what = distribution report of a pattern field for a set of log groups over a time range
 * .why = enables declarative analysis of log patterns and their sizes
 *
 * .identity
 *   - @unique = [logGroups, range, pattern, filter, limit] — defined by query parameters
 *   - no @primary — this is a computed/derived entity, not persisted
 *
 * .note
 *   - this is a readonly entity — data comes from CloudWatch Logs Insights
 *   - cacheability is determined by range (historical ranges are stable)
 */
export interface DeclaredAwsLogGroupReportDistOfPattern {
  /**
   * .what = the log groups queried
   * .note = part of @unique
   */
  logGroups: RefByUnique<typeof DeclaredAwsLogGroup>[];

  /**
   * .what = the time range queried
   * .note = part of @unique
   */
  range: UniDateTimeRange;

  /**
   * .what = the pattern field to analyze frequency of
   * .note = part of @unique — e.g., '@message', 'level', 'requestId'
   * .example = '@message' to get frequency of unique messages
   */
  pattern: string;

  /**
   * .what = query filter (e.g., exclude REPORT, START, END)
   * .note = part of @unique — Logs Insights filter pattern; null means no filter
   */
  filter: string | null;

  /**
   * .what = max number of unique pattern values to return
   * .note = part of @unique — null means use default (1000)
   */
  limit: number | null;

  /**
   * .what = total bytes scanned by the query
   * .note = @readonly
   */
  scannedBytes?: number;

  /**
   * .what = total log events matched
   * .note = @readonly
   */
  matchedEvents?: number;

  /**
   * .what = the distribution rows sorted by frequency descending
   * .note = @readonly — computed by CloudWatch Logs Insights
   */
  rows?: DeclaredAwsLogGroupReportDistOfPatternRow[];
}

export class DeclaredAwsLogGroupReportDistOfPattern
  extends DomainEntity<DeclaredAwsLogGroupReportDistOfPattern>
  implements DeclaredAwsLogGroupReportDistOfPattern
{
  // no primary — derived entity

  /**
   * .what = unique by query parameters
   */
  public static unique = [
    'logGroups',
    'range',
    'pattern',
    'filter',
    'limit',
  ] as const;

  /**
   * .what = no metadata
   */
  public static metadata = [] as const;

  /**
   * .what = intrinsic attributes resolved from AWS, not user-settable
   */
  public static readonly = ['rows', 'scannedBytes', 'matchedEvents'] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    logGroups: RefByUnique<typeof DeclaredAwsLogGroup>,
    range: DomainLiteral,
    rows: DeclaredAwsLogGroupReportDistOfPatternRow,
  };
}
