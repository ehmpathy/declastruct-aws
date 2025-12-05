import type { GetQueryResultsCommandOutput as SdkAwsGetQueryResultsCommandOutput } from '@aws-sdk/client-cloudwatch-logs';
import type { UniDateTimeRange } from '@ehmpathy/uni-time';
import {
  type HasReadonly,
  hasReadonly,
  type RefByUnique,
} from 'domain-objects';
import { assure } from 'type-fns';

import type { DeclaredAwsLogGroup } from '../../domain.objects/DeclaredAwsLogGroup';
import {
  DeclaredAwsLogGroupReportDistOfPattern,
  DeclaredAwsLogGroupReportDistOfPatternRow,
} from '../../domain.objects/DeclaredAwsLogGroupReportDistOfPattern';

/**
 * .what = input for castIntoDeclaredAwsLogGroupReportDistOfPattern
 * .why = combines query parameters with AWS SDK response
 */
export interface CastIntoDeclaredAwsLogGroupReportDistOfPatternInput {
  unique: {
    logGroups: RefByUnique<typeof DeclaredAwsLogGroup>[];
    range: UniDateTimeRange;
    pattern: string;
    filter: string | null;
    limit: number | null;
  };
  results: SdkAwsGetQueryResultsCommandOutput;
}

/**
 * .what = extracts a field value from a query result row
 * .why = query results are arrays of { field, value } pairs
 */
const getFieldValue = (
  row: Array<{ field?: string; value?: string }>,
  fieldName: string,
): string | undefined => {
  const entry = row.find((r) => r.field === fieldName);
  return entry?.value;
};

/**
 * .what = transforms CloudWatch Logs Insights query results into domain object
 * .why = maps AWS response shape to DeclaredAwsLogGroupReportDistOfPattern
 */
export const castIntoDeclaredAwsLogGroupReportDistOfPattern = (
  input: CastIntoDeclaredAwsLogGroupReportDistOfPatternInput,
): HasReadonly<typeof DeclaredAwsLogGroupReportDistOfPattern> => {
  const { unique, results } = input;

  // parse rows from results
  const rawRows = results.results ?? [];

  // calculate totals for percentages
  const totalFrequency = rawRows.reduce((sum, row) => {
    const freq = parseFloat(getFieldValue(row, 'frequency') ?? '0');
    return sum + freq;
  }, 0);

  const totalBytes = rawRows.reduce((sum, row) => {
    const bytes = parseFloat(getFieldValue(row, 'totalBytes') ?? '0');
    return sum + bytes;
  }, 0);

  // cast each row
  const rows: DeclaredAwsLogGroupReportDistOfPatternRow[] = rawRows.map(
    (row) => {
      const value = getFieldValue(row, unique.pattern) ?? '';
      const frequency = parseFloat(getFieldValue(row, 'frequency') ?? '0');
      const rowTotalBytes = parseFloat(getFieldValue(row, 'totalBytes') ?? '0');
      const avgBytes = parseFloat(getFieldValue(row, 'avgBytes') ?? '0');

      return DeclaredAwsLogGroupReportDistOfPatternRow.as({
        value,
        frequency,
        totalBytes: rowTotalBytes,
        avgBytes,
        percentOfTotal: {
          frequency:
            totalFrequency > 0 ? (frequency / totalFrequency) * 100 : 0,
          bytes: totalBytes > 0 ? (rowTotalBytes / totalBytes) * 100 : 0,
        },
      });
    },
  );

  // cast and assure readonly fields are present
  return assure(
    DeclaredAwsLogGroupReportDistOfPattern.as({
      logGroups: unique.logGroups,
      range: unique.range,
      pattern: unique.pattern,
      filter: unique.filter,
      limit: unique.limit,
      scannedBytes: results.statistics?.bytesScanned,
      matchedEvents: results.statistics?.recordsMatched,
      rows,
    }),
    // note: hasReadonly ensures all `public static readonly` fields are defined on the object
    // this validates that AWS returned all expected readonly attributes after read
    hasReadonly({ of: DeclaredAwsLogGroupReportDistOfPattern }),
  );
};
