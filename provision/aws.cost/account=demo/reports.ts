import type { DeclastructProvider } from 'declastruct';
import type { DomainEntity } from 'domain-objects';
import { asIsoTimeStamp } from 'iso-time';
import { keyrack } from 'rhachet/keyrack';
import { genLogMethods } from 'sdk-logs';

import {
  COST_EXPLORER_PREFERENCE_FEATURES,
  DeclaredAwsCostExplorerPreference,
  DeclaredAwsCostReportRecommendationsToPurchasePlan,
  DeclaredAwsCostReportRecommendationsToRightsize,
  DeclaredAwsCostReportSpendForecast,
  DeclaredAwsCostReportSpendObserved,
  DeclaredAwsCostReportSpendObservedByResource,
  getDeclastructAwsProvider,
} from '../../../src/contract/sdks';

// source aws credentials from keyrack
keyrack.source({ env: 'prep', owner: 'ehmpath', mode: 'lenient' });

const log = genLogMethods();

/**
 * .what = the UTC day-start IsoTimeStamp for a date shifted by `addDays` from now
 * .why = the forecast window must start today-or-later (GetCostForecast rejects a past
 *        `since`); a value derived off the current day keeps this wish runnable any day,
 *        unlike a hardcoded date that goes stale within 24h
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
 * .what = the UTC first-of-month IsoTimeStamp for the month shifted by `addMonths`
 * .why = the observed report reads a settled PAST month; deriving it off the current
 *        month keeps this wish runnable any day without a hand-edit
 */
const asUtcMonthStartStamp = (input: { addMonths: number }): string => {
  const now = new Date();
  const shifted = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + input.addMonths, 1),
  );
  return `${shifted.toISOString().slice(0, 10)}T00:00:00.000Z`;
};

/**
 * .what = the dogfood cost-report wish for the demo account — the artifact the vision's
 *         "day in the life" points a human at:
 *           npx declastruct plan --wish provision/aws.cost/account=demo/reports.ts \
 *             --into .temp/plan.json
 * .why = mirrors feat-budget's `provision/aws.infra/account=demo/resources.budget.ts`
 *        dogfood, but for the READ-ONLY reports: you `plan` it and read where the money
 *        goes / is headed / can be saved. read-only, so there is no state to `apply` — the
 *        plan reads each report live and shows KEEP
 *
 * .note = LIVE + billed. each report is a real Cost Explorer read ($0.01/request). run it
 *        deliberately, not in a loop.
 * .note = ACCOUNT choice is a wisher decision (vision assumption #7): the demo account is
 *        capped at $21/mo, so its observed report is near-empty and its forecast may
 *        DataUnavailable (degrades to an empty forecast, not a throw). a higher-spend
 *        account (or the payer account with a LINKED_ACCOUNT filter) showcases the reports
 *        far better — point this wish there when the wisher decides.
 * .note = STALENESS (vision's identity-vs-recency, option-a): the ranges below are derived
 *        off the current day at LOAD time, so this wish stays runnable any day. a user who
 *        hardcodes ABSOLUTE dates in their own reports.ts gets a stable KEEP identity but a
 *        report frozen to that window — the symbolic-relative-range ergonomic that would
 *        keep "this month" current while it holds a stable identity is wisher-gated.
 */
export const getProviders = async (): Promise<DeclastructProvider[]> => [
  await getDeclastructAwsProvider({}, { log }),
];

export const getResources = async (): Promise<DomainEntity<any>[]> => {
  // the precondition: the console-only rightsize opt-in must be on before the rightsize
  // report can read. declared FIRST so `plan` probes it up front — if it is off, apply
  // fails loud with guidance to switch it on (payer console), instead of the rightsize
  // report that emits a cryptic AccessDenied. once on, this is a cheap KEEP
  const costExplorerPreference = DeclaredAwsCostExplorerPreference.as({
    feature: COST_EXPLORER_PREFERENCE_FEATURES.rightsizeRecommendations,
  });

  // the second console-only precondition: the FREE resource-level-data-at-daily-granularity
  // opt-in must be on before any per-RESOURCE_ID report can read (only the separate hourly
  // tier is paid). declared before the by-resource report so `plan` probes it up front — if
  // off, apply fails loud with guidance to switch it on (payer console), instead of the
  // by-resource report degraded to an empty read
  const resourceLevelDataPreference = DeclaredAwsCostExplorerPreference.as({
    feature: COST_EXPLORER_PREFERENCE_FEATURES.resourceLevelData,
  });

  // where the money goes, per EC2 instance: the last 13 days (within the ~14-day resource-
  // level retention window), grouped by RESOURCE_ID over the EC2 service (the api requires a
  // single-service filter). needs the resource-level opt-in above; empty read until it is on
  const spendObservedByResource =
    DeclaredAwsCostReportSpendObservedByResource.as({
      range: {
        since: asIsoTimeStamp(asUtcDayStartStamp({ addDays: -13 })),
        until: asIsoTimeStamp(asUtcDayStartStamp({ addDays: 0 })),
      },
      granularity: 'DAILY',
      filter: {
        dimension: 'SERVICE',
        values: ['Amazon Elastic Compute Cloud - Compute'],
      },
      metric: 'UnblendedCost',
    });

  // where the money goes: last full month, grouped by service
  const spendObserved = DeclaredAwsCostReportSpendObserved.as({
    range: {
      since: asIsoTimeStamp(asUtcMonthStartStamp({ addMonths: -1 })),
      until: asIsoTimeStamp(asUtcMonthStartStamp({ addMonths: 0 })),
    },
    granularity: 'MONTHLY',
    groupBy: { dimension: 'SERVICE' },
    filter: null,
    // note: UnblendedCost is the GROSS default; NetUnblendedCost is net-of-credits —
    //   which one matches "where money GOES" is the vision's gross-vs-net wisher fork
    metric: 'UnblendedCost',
  });

  // where the money is headed: the next 30 days
  const spendForecast = DeclaredAwsCostReportSpendForecast.as({
    range: {
      since: asIsoTimeStamp(asUtcDayStartStamp({ addDays: 0 })),
      until: asIsoTimeStamp(asUtcDayStartStamp({ addDays: 30 })),
    },
    granularity: 'MONTHLY',
    metric: 'UnblendedCost',
    filter: null,
    predictionInterval: 80,
  });

  // where we can save: oversized/idle EC2
  const recommendationsToRightsize =
    DeclaredAwsCostReportRecommendationsToRightsize.as({
      service: 'AmazonEC2',
      recommendationTarget: 'SAME_INSTANCE_FAMILY',
      benefitsConsidered: true,
      filter: null,
    });

  // where we can save: a savings-plan commitment (LINKED = this member account)
  const recommendationsToPurchasePlan =
    DeclaredAwsCostReportRecommendationsToPurchasePlan.as({
      savingsPlansType: 'COMPUTE_SP',
      termInYears: 'ONE_YEAR',
      paymentOption: 'NO_UPFRONT',
      lookbackDays: 'THIRTY_DAYS',
      accountScope: 'LINKED',
      filter: null,
    });

  return [
    // precondition first — plan probes the opt-in before the billed report reads
    costExplorerPreference,
    spendObserved,
    spendForecast,
    recommendationsToRightsize,
    recommendationsToPurchasePlan,
    // the paid resource-level opt-in, then the per-instance report that depends on it
    resourceLevelDataPreference,
    spendObservedByResource,
  ];
};
