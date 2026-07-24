/* eslint-disable no-console */
/**
 * .what = reads the declarative cost-report resources via their DAOs and emits a
 *         human-readable markdown report to stdout — composition, trend, forecast,
 *         and savings opportunities
 * .why = a cost report is READ-ONLY — you do not `apply` it, you READ it. `plan` only
 *        shows KEEP + the query identity; the money numbers are resolved by the read.
 *        this worker demoes the imperative get-path: DAO.get.one.byUnique(query, context)
 *        returns the fully-resolved domain object (buckets, points, recommendations), which
 *        we format into markdown for human eyes. the .sh wrapper sources creds + runs this
 * .note = LIVE + billed — each report is a real Cost Explorer read ($0.01/request), served
 *         from the on-disk cache within its ttl. run deliberately, not in a loop
 * .note = WEEKLY is not an AWS granularity (GetCostAndUsage is DAILY | MONTHLY only), so the
 *         weekly trend is a client-side rollup of one DAILY read over the past 63 days — the
 *         same read also feeds the daily-7 table (one billed read serves both trend views)
 */
import { asIsoTimeStamp } from 'iso-time';
import { genLogMethods, LogLevel } from 'sdk-logs';

import {
  DeclaredAwsCostReportRecommendationsToPurchasePlanDao,
  DeclaredAwsCostReportRecommendationsToRightsizeDao,
  DeclaredAwsCostReportSpendForecastDao,
  DeclaredAwsCostReportSpendObservedDao,
  getDeclastructAwsProvider,
} from '../../../../src/contract/sdks';

// keep provider setup quiet; real warnings + errors still reach the console
const log = genLogMethods({ level: { minimum: LogLevel.WARN } });

/**
 * .what = the UTC day-start portion of a Date as a YYYY-MM-DD stamp
 */
const asUtcDayStamp = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * .what = the UTC first-of-month stamp for the month shifted by `addMonths`
 * .why = the observed report reads a settled PAST month, derived off today so this
 *        demo stays runnable any day without a hand-edit
 */
const asUtcMonthStartStamp = (input: { addMonths: number }): string => {
  const now = new Date();
  const shifted = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + input.addMonths, 1),
  );
  return `${asUtcDayStamp(shifted)}T00:00:00.000Z`;
};

/**
 * .what = the UTC day-start stamp for a date shifted by `addDays` from now
 * .why = derives daily trend + forecast windows off today so the demo stays runnable
 *        any day; the forecast window must start today-or-later (GetCostForecast rejects
 *        a past `since`)
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
 * .what = formats a cost amount for a markdown cell (empty → em-dash)
 */
const asMoney = (
  amount: { amount: string; unit: string } | null | undefined,
): string => (amount ? `${amount.amount} ${amount.unit}` : '—');

/**
 * .what = parses a decimal cost amount to a JS number (empty → 0)
 * .note = display-only rollup; amounts are small here, so float sum is acceptable
 */
const asNumber = (amount: { amount: string } | null | undefined): number =>
  amount ? Number(amount.amount) : 0;

/**
 * .what = formats a summed number as a money cell
 */
const asMoneySum = (input: { total: number; unit: string }): string =>
  `${input.total.toFixed(4)} ${input.unit}`;

/**
 * .what = a flattened daily spend point — one settled day of total spend
 */
interface DailySpendPoint {
  date: string;
  total: number;
  unit: string;
  estimated: boolean;
}

/**
 * .what = rolls consecutive daily points up into fixed-size week buckets
 * .why = AWS has no WEEKLY granularity, so a weekly trend is a client-side rollup —
 *        chunk the daily points into 7-day groups (oldest first) and sum each
 */
const asWeeklyBuckets = (input: {
  daily: DailySpendPoint[];
  daysPerWeek: number;
}): {
  since: string;
  until: string;
  total: number;
  unit: string;
  estimated: boolean;
}[] => {
  const weeks: {
    since: string;
    until: string;
    total: number;
    unit: string;
    estimated: boolean;
  }[] = [];
  for (let i = 0; i < input.daily.length; i += input.daysPerWeek) {
    const chunk = input.daily.slice(i, i + input.daysPerWeek);
    if (!chunk.length) continue;
    weeks.push({
      since: chunk[0]!.date,
      until: chunk[chunk.length - 1]!.date,
      total: chunk.reduce((sum, point) => sum + point.total, 0),
      unit: chunk.find((point) => point.total)?.unit ?? 'USD',
      estimated: chunk.some((point) => point.estimated),
    });
  }
  return weeks;
};

const main = async (): Promise<void> => {
  const provider = await getDeclastructAwsProvider({}, { log });
  const context = { ...provider.context, log };

  const observedRange = {
    since: asIsoTimeStamp(asUtcMonthStartStamp({ addMonths: -1 })),
    until: asIsoTimeStamp(asUtcMonthStartStamp({ addMonths: 0 })),
  };
  // one DAILY read over the past 63 days (9 weeks) — feeds BOTH the daily-7 table and
  // the weekly-9 rollup below. `until` is today-start (end-exclusive), so the last
  // bucket is yesterday — no partial-today bucket in the trend
  const trendRange = {
    since: asIsoTimeStamp(asUtcDayStartStamp({ addDays: -63 })),
    until: asIsoTimeStamp(asUtcDayStartStamp({ addDays: 0 })),
  };
  const forecastRange = {
    since: asIsoTimeStamp(asUtcDayStartStamp({ addDays: 0 })),
    until: asIsoTimeStamp(asUtcDayStartStamp({ addDays: 30 })),
  };

  // READ each report resource via its DAO — this is the imperative get-path; the DAO
  // returns the fully-resolved domain object with the @readonly money fields populated
  const observed = await DeclaredAwsCostReportSpendObservedDao.get.one.byUnique(
    {
      range: observedRange,
      granularity: 'MONTHLY',
      groupBy: { dimension: 'SERVICE' },
      filter: null,
      metric: 'UnblendedCost',
    },
    context,
  );
  const observedDaily =
    await DeclaredAwsCostReportSpendObservedDao.get.one.byUnique(
      {
        range: trendRange,
        granularity: 'DAILY',
        groupBy: { dimension: 'SERVICE' },
        filter: null,
        metric: 'UnblendedCost',
      },
      context,
    );
  const forecast = await DeclaredAwsCostReportSpendForecastDao.get.one.byUnique(
    {
      range: forecastRange,
      granularity: 'MONTHLY',
      metric: 'UnblendedCost',
      filter: null,
      predictionInterval: 80,
    },
    context,
  );
  const rightsize =
    await DeclaredAwsCostReportRecommendationsToRightsizeDao.get.one.byUnique(
      {
        service: 'AmazonEC2',
        recommendationTarget: 'SAME_INSTANCE_FAMILY',
        benefitsConsidered: true,
        filter: null,
      },
      context,
    );
  const purchasePlan =
    await DeclaredAwsCostReportRecommendationsToPurchasePlanDao.get.one.byUnique(
      {
        savingsPlansType: 'COMPUTE_SP',
        termInYears: 'ONE_YEAR',
        paymentOption: 'NO_UPFRONT',
        lookbackDays: 'THIRTY_DAYS',
        accountScope: 'LINKED',
        filter: null,
      },
      context,
    );

  // flatten the daily buckets into settled points (oldest first) — the shared input for
  // both the daily-7 table and the weekly-9 rollup
  const dailyPoints: DailySpendPoint[] = (observedDaily?.buckets ?? []).map(
    (bucket) => ({
      date: String(bucket.range.since).slice(0, 10),
      total: asNumber(bucket.total),
      unit: bucket.total?.unit ?? 'USD',
      estimated: bucket.estimated ?? false,
    }),
  );

  // build the markdown
  const lines: string[] = [];
  lines.push(`# aws cost report`);
  lines.push('');
  lines.push(`_generated ${new Date().toISOString()} — live Cost Explorer read_`);
  lines.push('');

  // 1. where the money went (composition, last full month)
  lines.push(`## where the money went (last full month, by service)`);
  lines.push('');
  lines.push(`- range: \`${observedRange.since}\` → \`${observedRange.until}\``);
  lines.push(`- total: **${asMoney(observed?.total)}**`);
  lines.push('');
  const groups = observed?.buckets?.flatMap((b) => b.groups) ?? [];
  if (groups.length) {
    lines.push(`| service | cost |`);
    lines.push(`| --- | --- |`);
    for (const g of groups)
      lines.push(`| ${g.keys.join(', ')} | ${asMoney(g.cost)} |`);
  } else {
    lines.push(`_no spend in range (or account too new)._`);
  }
  lines.push('');

  // 2. spend trend — daily (past 7 days)
  lines.push(`## spend trend — daily (past 7 days)`);
  lines.push('');
  const dailyLast7 = dailyPoints.slice(-7);
  if (dailyLast7.length) {
    lines.push(`| day | spend | estimated? |`);
    lines.push(`| --- | --- | --- |`);
    for (const point of dailyLast7)
      lines.push(
        `| ${point.date} | ${asMoneySum({ total: point.total, unit: point.unit })} | ${point.estimated ? 'yes ⚠️' : ''} |`,
      );
  } else {
    lines.push(`_no daily spend in range (or account too new)._`);
  }
  lines.push('');

  // 3. spend trend — weekly (past 9 weeks, rolled up from daily)
  lines.push(`## spend trend — weekly (past 9 weeks)`);
  lines.push('');
  const weeklyBuckets = asWeeklyBuckets({ daily: dailyPoints, daysPerWeek: 7 });
  if (weeklyBuckets.length) {
    lines.push(`| week start | week end | spend | estimated? |`);
    lines.push(`| --- | --- | --- | --- |`);
    for (const week of weeklyBuckets)
      lines.push(
        `| ${week.since} | ${week.until} | ${asMoneySum({ total: week.total, unit: week.unit })} | ${week.estimated ? 'yes ⚠️' : ''} |`,
      );
  } else {
    lines.push(`_no weekly spend in range (or account too new)._`);
  }
  lines.push('');

  // 4. where the money is headed (forecast)
  lines.push(`## where the money is headed (next 30 days, 80% confidence)`);
  lines.push('');
  lines.push(`- range: \`${forecastRange.since}\` → \`${forecastRange.until}\``);
  lines.push(`- mean forecast: **${asMoney(forecast?.total)}**`);
  lines.push('');
  const points = forecast?.points ?? [];
  if (points.length) {
    lines.push(`| window start | mean | lower | upper | unit |`);
    lines.push(`| --- | --- | --- | --- | --- |`);
    for (const p of points)
      lines.push(
        `| ${p.range.since} | ${p.mean} | ${p.lower} | ${p.upper} | ${p.unit} |`,
      );
  } else {
    lines.push(`_no forecast — account has too little history to project._`);
  }
  lines.push('');

  // 5. cost opportunities — potential monthly savings (rightsize + savings plan)
  const rightsizeSavings = rightsize?.summary?.estimatedMonthlySavings;
  const purchasePlanSavings = purchasePlan?.summary?.estimatedMonthlySavings;
  const opportunityUnit =
    rightsizeSavings?.unit ?? purchasePlanSavings?.unit ?? 'USD';
  const opportunityTotal =
    asNumber(rightsizeSavings) + asNumber(purchasePlanSavings);
  lines.push(`## cost opportunities — potential monthly savings`);
  lines.push('');
  lines.push(
    `- combined potential monthly savings: **${asMoneySum({ total: opportunityTotal, unit: opportunityUnit })}**`,
  );
  lines.push('');

  // 5a. resize idle/oversized EC2
  lines.push(`### resize idle/oversized EC2`);
  lines.push('');
  lines.push(`- estimated monthly savings: **${asMoney(rightsizeSavings)}**`);
  lines.push(`- recommendations: ${rightsize?.recommendations?.length ?? 0}`);
  lines.push('');
  const recs = rightsize?.recommendations ?? [];
  if (recs.length) {
    lines.push(`| resource | action | current cost | est. savings |`);
    lines.push(`| --- | --- | --- | --- |`);
    for (const r of recs)
      lines.push(
        `| ${r.resourceId} | ${r.action} | ${asMoney(r.currentMonthlyCost)} | ${asMoney(r.estimatedMonthlySavings)} |`,
      );
  } else {
    lines.push(
      `_no rightsize recommendations — either the opt-in is off (provision \`DeclaredAwsCostExplorerPreference\`), or the account has no oversized EC2._`,
    );
  }
  lines.push('');

  // 5b. buy a Savings Plan
  lines.push(`### buy a Savings Plan (Compute, 1yr, no-upfront)`);
  lines.push('');
  lines.push(`- estimated monthly savings: **${asMoney(purchasePlanSavings)}**`);
  lines.push(
    `- current on-demand spend: ${asMoney(purchasePlan?.summary?.currentOnDemandSpend)}`,
  );
  lines.push(`- recommendations: ${purchasePlan?.recommendations?.length ?? 0}`);
  lines.push('');

  console.log(lines.join('\n'));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
