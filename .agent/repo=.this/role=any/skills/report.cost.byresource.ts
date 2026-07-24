/* eslint-disable no-console */
/**
 * .what = reads the by-RESOURCE_ID observed-spend report and emits a per-EC2-instance
 *         cost breakdown — each id joined to its declastruct `exid` tag + live status, with
 *         last-1d / last-7d / 13d-total columns so the spend RATE is visible per box
 * .why = report.cost / report.cost.diagnose stop at the SERVICE grain; this drills to the
 *        exact instance. Cost Explorer returns per-resource dollars natively (no price
 *        inference), but only INSTANCE IDS — so this worker cross-refs DescribeInstances to
 *        attach the exid tag (this project stamps `exid`, not `Name`), the live status
 *        (running / stopped / stopped~hibernate / terminated), and the per-window rate.
 *        read-only: the report is GET, never applied; DescribeInstances is a read-only lookup
 * .note = LIVE + billed — one Cost Explorer read ($0.01/request), served from the on-disk
 *         cache within its ttl. requires the FREE resource-level-data-at-daily-granularity
 *         opt-in (declare DeclaredAwsCostExplorerPreference feature=resourceLevelData; only
 *         the separate hourly tier is paid); when off, the report degrades to empty and this
 *         prints the provision guidance
 * .note = 14-DAY CAP — resource-level data is retained ~14 days, so the window is bounded
 */
import { DescribeInstancesCommand, EC2Client } from '@aws-sdk/client-ec2';
import { asIsoTimeStamp } from 'iso-time';
import { genLogMethods, LogLevel } from 'sdk-logs';

import {
  DeclaredAwsCostReportSpendObservedByResourceDao,
  getDeclastructAwsProvider,
} from '../../../../src/contract/sdks';

// keep provider setup quiet; real warnings + errors still reach the console
const log = genLogMethods({ level: { minimum: LogLevel.WARN } });

/**
 * .what = the UTC day-start portion of a Date as a YYYY-MM-DD stamp
 */
const asUtcDayStamp = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * .what = the UTC day-start stamp for a date shifted by `addDays` from now
 */
const asUtcDayStartStamp = (input: { addDays: number }): string => {
  const now = new Date();
  const shifted = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + input.addDays,
    ),
  );
  return `${asUtcDayStamp(shifted)}T00:00:00.000Z`;
};

/**
 * .what = parses a decimal cost amount to a JS number (empty → 0)
 * .note = display-only rollup; amounts are small here, so float sum is acceptable
 */
const asNumber = (amount: { amount: string } | null | undefined): number =>
  amount ? Number(amount.amount) : 0;

/**
 * .what = sums each resource id's cost across the buckets whose window starts on/after a cutoff
 * .why = the DAILY buckets let us scope to a recent window (last 1d / last 7d) so a reader
 *        can gauge the spend RATE per box, not just the flat 13-day sum
 */
const sumByResourceSince = (input: {
  buckets: {
    range: { since: string };
    groups: { keys: string[]; cost: { amount: string } | null }[];
  }[];
  sinceEpochMs: number;
}): Map<string, number> => {
  const acc = new Map<string, number>();
  for (const bucket of input.buckets) {
    if (new Date(bucket.range.since).getTime() < input.sinceEpochMs) continue;
    for (const group of bucket.groups) {
      const resourceId = group.keys[0] ?? '(unknown)';
      acc.set(resourceId, (acc.get(resourceId) ?? 0) + asNumber(group.cost));
    }
  }
  return acc;
};

/**
 * .what = renders a markdown table with every column padded to a fixed width, so the pipes
 *         line up when read in a monospace terminal
 * .why = an unpadded markdown table has ragged pipes that are hard to scan; equal-width
 *        columns make the numbers and labels align vertically
 * .note = align 'left' pads on the right (text); 'right' pads on the left (numbers)
 */
const asPaddedTable = (input: {
  headers: string[];
  rows: string[][];
  align: ('left' | 'right')[];
}): string[] => {
  // the width of each column = the widest cell (header or any row) in that column
  const widths = input.headers.map((header, col) =>
    Math.max(
      header.length,
      ...input.rows.map((row) => (row[col] ?? '').length),
    ),
  );

  // pad one cell to its column width, on the side its alignment dictates
  const pad = (text: string, col: number): string => {
    const gap = ' '.repeat(Math.max(0, widths[col]! - text.length));
    return input.align[col] === 'right' ? `${gap}${text}` : `${text}${gap}`;
  };

  const asRow = (cells: string[]): string =>
    `| ${cells.map((cell, col) => pad(cell, col)).join(' | ')} |`;

  // the separator row: dashes to each column width, so the divider lines up too
  const separator = `| ${widths.map((width) => '-'.repeat(width)).join(' | ')} |`;

  return [asRow(input.headers), separator, ...input.rows.map(asRow)];
};

const main = async (): Promise<void> => {
  const provider = await getDeclastructAwsProvider({}, { log });
  const context = { ...provider.context, log };

  // stay within the ~14-day resource-level retention window (13 days back, end-exclusive)
  const range = {
    since: asIsoTimeStamp(asUtcDayStartStamp({ addDays: -13 })),
    until: asIsoTimeStamp(asUtcDayStartStamp({ addDays: 0 })),
  };

  // READ the by-resource report via its DAO — the imperative get-path. always grouped by
  // RESOURCE_ID; filter is required (pin SERVICE to EC2 compute)
  const report =
    await DeclaredAwsCostReportSpendObservedByResourceDao.get.one.byUnique(
      {
        range,
        granularity: 'DAILY',
        filter: {
          dimension: 'SERVICE',
          values: ['Amazon Elastic Compute Cloud - Compute'],
        },
        metric: 'UnblendedCost',
      },
      context,
    );

  // sum each resource over three recent windows (1d / 7d / 13d) so the RATE is visible, not
  // just the flat total. the 13d map (all buckets) is also the full id set.
  // .note = anchor the windows to the range END (a day boundary), NOT to wall-clock `now`:
  //   the range is end-exclusive at today 00:00, so it already excludes the inflight partial
  //   day. so "last 1d" is the last FULL day (yesterday's bucket), counted back from that day
  //   boundary — a `now`-based cutoff would fall mid-yesterday and drop that full-day bucket
  const buckets = report?.buckets ?? [];
  const DAY_MS = 24 * 60 * 60 * 1000;
  const untilEpochMs = new Date(range.until).getTime();
  const cost1d = sumByResourceSince({
    buckets,
    sinceEpochMs: untilEpochMs - 1 * DAY_MS,
  });
  const cost7d = sumByResourceSince({
    buckets,
    sinceEpochMs: untilEpochMs - 7 * DAY_MS,
  });
  const cost13d = sumByResourceSince({ buckets, sinceEpochMs: -Infinity });

  // the currency label — read from any group (they share one currency here)
  let unit = 'USD';
  for (const bucket of buckets)
    for (const group of bucket.groups) unit = group.cost?.unit ?? unit;

  // join each id to its declastruct `exid` tag, its Name tag, and its live status via a
  // read-only DescribeInstances lookup.
  // .note = use the `instance-id` FILTER, not the `InstanceIds` param: cost history outlives
  //   the instance, so most ids here point at TERMINATED boxes. the `InstanceIds` param
  //   rejects the WHOLE batch with InvalidInstanceID.NotFound if ANY id is gone, whereas the
  //   filter form silently returns only the instances that still exist (a terminated id is
  //   simply absent from the result — the correct, non-throw outcome)
  const instanceIds = [...cost13d.keys()].filter((id) => id.startsWith('i-'));
  const metaById = new Map<
    string,
    { exid?: string; name?: string; state?: string; hibernateReady: boolean }
  >();
  if (instanceIds.length) {
    const ec2 = new EC2Client({ region: context.aws.credentials.region });
    const described = await ec2.send(
      new DescribeInstancesCommand({
        Filters: [{ Name: 'instance-id', Values: instanceIds }],
      }),
    );
    // an id the filter returns is EXTANT; one it omits is TERMINATED (cost outlives it)
    for (const reservation of described.Reservations ?? [])
      for (const instance of reservation.Instances ?? []) {
        const id = instance.InstanceId;
        if (!id) continue;
        const tags = instance.Tags ?? [];
        metaById.set(id, {
          exid: tags.find((tag) => tag.Key === 'exid')?.Value,
          name: tags.find((tag) => tag.Key === 'Name')?.Value,
          state: instance.State?.Name,
          hibernateReady: instance.HibernationOptions?.Configured ?? false,
        });
      }
  }

  // the human label prefers the declastruct exid, then Name, then flags an untagged/absent box
  const asLabel = (id: string): string => {
    const meta = metaById.get(id);
    if (!meta) return '(terminated)';
    return meta.exid ?? meta.name ?? '(no exid/Name tag)';
  };
  // the live status; a stopped box that is hibernate-enabled reads as a hibernate, not a plain stop
  const asStatus = (id: string): string => {
    const meta = metaById.get(id);
    if (!meta) return 'terminated';
    if (meta.state === 'stopped' && meta.hibernateReady)
      return 'stopped~hibernate';
    return meta.state ?? 'unknown';
  };

  // build the markdown
  const lines: string[] = [];
  lines.push(`# aws cost report — by EC2 instance`);
  lines.push('');
  lines.push(`_generated ${new Date().toISOString()} — live Cost Explorer read_`);
  lines.push('');
  lines.push(`- range: \`${range.since}\` → \`${range.until}\` (DAILY, last 13 days)`);
  lines.push(`- total: **${asNumber(report?.total).toFixed(4)} ${unit}**`);
  lines.push('');

  // sort by 13-day total, the biggest spender first
  const rows = [...cost13d.entries()].sort((a, b) => b[1] - a[1]);
  if (rows.length) {
    lines.push(
      ...asPaddedTable({
        headers: [
          'instance id',
          'name',
          'status',
          'last 1d',
          'last 7d',
          `13d total (${unit})`,
        ],
        // text columns left-aligned; the three cost columns right-aligned
        align: ['left', 'left', 'left', 'right', 'right', 'right'],
        rows: rows.map(([resourceId, total13]) => [
          resourceId,
          asLabel(resourceId),
          asStatus(resourceId),
          (cost1d.get(resourceId) ?? 0).toFixed(4),
          (cost7d.get(resourceId) ?? 0).toFixed(4),
          total13.toFixed(4),
        ]),
      }),
    );
  } else {
    lines.push(
      `_no per-resource rows — the free resource-level-data-at-daily-granularity opt-in is likely off. provision \`DeclaredAwsCostExplorerPreference\` (feature=resourceLevelData) + enable it in the payer console (choose at least one service), then re-run._`,
    );
  }
  lines.push('');

  console.log(lines.join('\n'));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
