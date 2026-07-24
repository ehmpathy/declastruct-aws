/* eslint-disable no-console */
/**
 * .what = diagnoses a spend change: it groups OBSERVED spend along an axis (service,
 *         usage-type, tag, ...) and ranks the MOVERS — the groups whose spend rose or
 *         fell the most between a prior window and a recent window
 * .why = the plain report.cost skill shows THAT spend trended up; this peer skill answers
 *        WHY — which service/tag drove the step-up. it reads one DAILY SpendObserved report
 *        over the last 2×window days, splits the daily buckets into a prior half and a
 *        recent half, sums each group per half, and diffs them so the biggest movers surface
 *        first. an optional --filter drills into one dimension (e.g. a single service)
 * .note = LIVE + billed — one Cost Explorer read ($0.01/request), served from the on-disk
 *         cache within its ttl. run deliberately, not in a loop
 *
 * usage (via the .sh wrapper):
 *   rhx report.cost.diagnose                          # by SERVICE, 14-day windows
 *   rhx report.cost.diagnose --group USAGE_TYPE       # by usage type
 *   rhx report.cost.diagnose --group tag:env          # by a cost-allocation tag
 *   rhx report.cost.diagnose --window 30              # 30-day prior vs 30-day recent
 *   rhx report.cost.diagnose --filter SERVICE=Amazon Elastic Compute Cloud - Compute
 */
import { asIsoTimeStamp } from 'iso-time';
import { genLogMethods, LogLevel } from 'sdk-logs';

import {
  DeclaredAwsCostReportSpendObservedDao,
  getDeclastructAwsProvider,
} from '../../../../src/contract/sdks';

// keep provider setup quiet; real warnings + errors still reach the console
const log = genLogMethods({ level: { minimum: LogLevel.WARN } });

/**
 * .what = the UTC day-start stamp for a date shifted by `addDays` from now
 * .why = derives the comparison windows off today so the diagnosis stays runnable any day
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
  return `${shifted.toISOString().slice(0, 10)}T00:00:00.000Z`;
};

/**
 * .what = parses a decimal cost amount to a JS number (empty → 0)
 * .note = display-only rollup; amounts are small here, so float sum is acceptable
 */
const asNumber = (amount: { amount: string } | null | undefined): number =>
  amount ? Number(amount.amount) : 0;

/**
 * .what = formats a number as a signed money delta cell (+ up, - down)
 */
const asDelta = (input: { value: number; unit: string }): string => {
  const sign = input.value > 0 ? '+' : '';
  return `${sign}${input.value.toFixed(4)} ${input.unit}`;
};

/**
 * .what = a percent-change cell between two sums (new-account group → "new")
 */
const asPercent = (input: { prior: number; recent: number }): string => {
  if (input.prior === 0) return input.recent > 0 ? 'new' : '—';
  const pct = ((input.recent - input.prior) / input.prior) * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(0)}%`;
};

/**
 * .what = parses the --group arg into a SpendObserved groupBy (tag:<key> → tag, else dimension)
 */
const asGroupBy = (group: string): { dimension: string } | { tag: string } =>
  group.startsWith('tag:')
    ? { tag: group.slice('tag:'.length) }
    : { dimension: group };

/**
 * .what = parses the optional --filter arg (DIM=v1,v2) into a report filter, or null
 */
const asFilter = (
  filter: string | null,
): { dimension: string; values: string[] } | null => {
  if (!filter) return null;
  const [dimension, values] = filter.split('=');
  if (!dimension || !values)
    throw new Error(`bad --filter "${filter}"; want DIM=value1,value2`);
  return { dimension, values: values.split(',').map((v) => v.trim()) };
};

const main = async (): Promise<void> => {
  // parse args (the .sh wrapper forwards them raw)
  const argv = process.argv.slice(2);
  const argOf = (flag: string): string | null => {
    const at = argv.indexOf(flag);
    return at >= 0 && argv[at + 1] ? argv[at + 1]! : null;
  };
  const group = argOf('--group') ?? 'SERVICE';
  const windowDays = Number(argOf('--window') ?? '14');
  const metric = argOf('--metric') ?? 'UnblendedCost';
  const filter = asFilter(argOf('--filter'));

  const provider = await getDeclastructAwsProvider({}, { log });
  const context = { ...provider.context, log };

  // one DAILY read across BOTH windows: [today-2w, today-w) = prior, [today-w, today) = recent
  const priorStart = asUtcDayStartStamp({ addDays: -2 * windowDays });
  const splitAt = asUtcDayStartStamp({ addDays: -windowDays });
  const recentEnd = asUtcDayStartStamp({ addDays: 0 });
  const report = await DeclaredAwsCostReportSpendObservedDao.get.one.byUnique(
    {
      range: {
        since: asIsoTimeStamp(priorStart),
        until: asIsoTimeStamp(recentEnd),
      },
      granularity: 'DAILY',
      groupBy: asGroupBy(group),
      filter,
      metric,
    },
    context,
  );

  // sum each group's spend into a prior half + a recent half, keyed by the group name
  const priorByKey = new Map<string, number>();
  const recentByKey = new Map<string, number>();
  let unit = 'USD';
  for (const bucket of report?.buckets ?? []) {
    const day = String(bucket.range.since).slice(0, 10);
    const target = day < splitAt.slice(0, 10) ? priorByKey : recentByKey;
    for (const g of bucket.groups) {
      const key = g.keys.join(', ') || '(untagged)';
      unit = g.cost?.unit ?? unit;
      target.set(key, (target.get(key) ?? 0) + asNumber(g.cost));
    }
  }

  // union the keys, compute the delta per key, sort by biggest absolute move
  const allKeys = new Set<string>([...priorByKey.keys(), ...recentByKey.keys()]);
  const movers = [...allKeys]
    .map((key) => {
      const prior = priorByKey.get(key) ?? 0;
      const recent = recentByKey.get(key) ?? 0;
      return { key, prior, recent, delta: recent - prior };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const priorTotal = movers.reduce((sum, m) => sum + m.prior, 0);
  const recentTotal = movers.reduce((sum, m) => sum + m.recent, 0);

  // build the markdown
  const lines: string[] = [];
  lines.push(`# aws cost diagnosis`);
  lines.push('');
  lines.push(`_generated ${new Date().toISOString()} — live Cost Explorer read_`);
  lines.push('');
  lines.push(`- grouped by: \`${group}\``);
  lines.push(`- metric: \`${metric}\``);
  if (filter)
    lines.push(`- filter: \`${filter.dimension}=${filter.values.join(',')}\``);
  lines.push(
    `- prior window: \`${priorStart.slice(0, 10)}\` → \`${splitAt.slice(0, 10)}\` (${windowDays}d)`,
  );
  lines.push(
    `- recent window: \`${splitAt.slice(0, 10)}\` → \`${recentEnd.slice(0, 10)}\` (${windowDays}d)`,
  );
  lines.push(
    `- window total: prior **${priorTotal.toFixed(4)} ${unit}** → recent **${recentTotal.toFixed(4)} ${unit}** (${asDelta({ value: recentTotal - priorTotal, unit })})`,
  );
  lines.push('');

  // the movers — what drove the change, biggest absolute delta first
  lines.push(`## movers (what drove the change)`);
  lines.push('');
  if (movers.length) {
    lines.push(`| ${group} | prior | recent | delta | change |`);
    lines.push(`| --- | --- | --- | --- | --- |`);
    for (const m of movers)
      lines.push(
        `| ${m.key} | ${m.prior.toFixed(4)} ${unit} | ${m.recent.toFixed(4)} ${unit} | ${asDelta({ value: m.delta, unit })} | ${asPercent({ prior: m.prior, recent: m.recent })} |`,
      );
  } else {
    lines.push(`_no spend in either window (or account too new)._`);
  }
  lines.push('');
  lines.push(
    `_tip: drill into the top mover with \`--filter ${group.startsWith('tag:') ? group.slice(4) : group}=<name>\`, or re-group with \`--group USAGE_TYPE\` / \`--group tag:<key>\`._`,
  );
  lines.push('');

  console.log(lines.join('\n'));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
