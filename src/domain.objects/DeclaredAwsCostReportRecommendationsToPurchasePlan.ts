import { DomainEntity, DomainLiteral } from 'domain-objects';

import { DeclaredAwsCostAmount } from './DeclaredAwsCostAmount';
import { DeclaredAwsCostReportFilter } from './DeclaredAwsCostReportFilter';

/**
 * .what = a single savings-plan purchase recommendation
 * .why = each names the plan detail, the commitment to purchase, and the
 *        estimated monthly savings if the plan is bought
 * .note = money-shape divergence (deliberate): `upfrontCost` +
 *         `hourlyCommitmentToPurchase` are bare decimal STRINGS with NO unit field,
 *         while `estimatedMonthlySavings` is a full DeclaredAwsCostAmount { amount, unit }.
 *         the reason is AWS: the SavingsPlansPurchaseRecommendationDetail commitment
 *         fields (UpfrontCost, HourlyCommitmentToPurchase) are returned as bare strings
 *         with NO CurrencyCode, whereas the savings amount carries one. so there is no
 *         unit to model for the commitment fields — a { amount, unit } would invent a
 *         currency AWS never returned. the strings stay decimal — money precision holds
 */
export interface DeclaredAwsCostReportRecommendationsToPurchasePlanItem {
  /**
   * .what = the up-front cost of the recommended plan (decimal string; AWS returns
   *         no currency code for this commitment field — see the .note above)
   */
  upfrontCost: string;

  /**
   * .what = the hourly commitment to purchase for the plan (decimal string; AWS
   *         returns no currency code for this commitment field — see the .note above)
   */
  hourlyCommitmentToPurchase: string;

  /**
   * .what = the estimated monthly savings if the plan is bought
   */
  estimatedMonthlySavings: DeclaredAwsCostAmount;

  /**
   * .what = the estimated return on investment (decimal string)
   */
  estimatedRoi: string;
}

export class DeclaredAwsCostReportRecommendationsToPurchasePlanItem
  extends DomainLiteral<DeclaredAwsCostReportRecommendationsToPurchasePlanItem>
  implements DeclaredAwsCostReportRecommendationsToPurchasePlanItem
{
  public static nested = {
    estimatedMonthlySavings: DeclaredAwsCostAmount,
  };
}

/**
 * .what = the roll-up summary of a savings-plan purchase recommendation set
 */
export interface DeclaredAwsCostReportRecommendationsToPurchasePlanSummary {
  /**
   * .what = the total estimated monthly savings across all recommendations
   */
  estimatedMonthlySavings: DeclaredAwsCostAmount;

  /**
   * .what = the savings as a percentage of the covered on-demand spend
   */
  estimatedSavingsPercentage: string;

  /**
   * .what = the estimated return on investment (decimal string)
   */
  estimatedRoi: string;

  /**
   * .what = the hourly commitment to purchase across the recommendation set
   */
  hourlyCommitmentToPurchase: string;

  /**
   * .what = the current on-demand spend that the plan would offset
   */
  currentOnDemandSpend: DeclaredAwsCostAmount;

  /**
   * .what = the count of recommendations
   */
  recommendationCount: number;
}

export class DeclaredAwsCostReportRecommendationsToPurchasePlanSummary
  extends DomainLiteral<DeclaredAwsCostReportRecommendationsToPurchasePlanSummary>
  implements DeclaredAwsCostReportRecommendationsToPurchasePlanSummary
{
  public static nested = {
    estimatedMonthlySavings: DeclaredAwsCostAmount,
    currentOnDemandSpend: DeclaredAwsCostAmount,
  };
}

/**
 * .what = a read-only report of where we can SAVE money by purchase of a Savings Plan
 * .why = answers "where can we save money?" — a commitment-purchase recommendation
 *        with per-plan detail + estimated savings, via the AWS savings-plans
 *        purchase-recommendation api
 *
 * .identity
 *   - @unique = [savingsPlansType, termInYears, paymentOption, lookbackDays,
 *                accountScope, filter]
 *   - no @primary — this is a computed/derived entity
 *   - NO range — AWS derives the window from lookbackDays
 *
 * .note
 *   - read-only: getOne composite only, no set/del
 *   - on a cache miss the getOne composite fires Start* best-effort (it does NOT poll
 *     or wait for the fresh generation), then reads whatever recommendation set
 *     currently exists; a generation-already-in-flight / too-little-history condition
 *     on Start* is tolerated, and the read proceeds to the current set
 */
export interface DeclaredAwsCostReportRecommendationsToPurchasePlan {
  /**
   * .what = the savings-plan type to recommend for
   * .example = 'COMPUTE_SP' | 'EC2_INSTANCE_SP' | 'SAGEMAKER_SP' | 'DATABASE_SP'
   * .note = part of @unique
   */
  savingsPlansType: string;

  /**
   * .what = the commitment term
   * .example = 'ONE_YEAR' | 'THREE_YEARS'
   * .note = part of @unique
   */
  termInYears: string;

  /**
   * .what = the payment option
   * .example = 'NO_UPFRONT' | 'PARTIAL_UPFRONT' | 'ALL_UPFRONT'
   * .note = part of @unique
   */
  paymentOption: string;

  /**
   * .what = the lookback window AWS analyzes to compute the recommendation
   * .example = 'SEVEN_DAYS' | 'THIRTY_DAYS' | 'SIXTY_DAYS'
   * .note = part of @unique
   */
  lookbackDays: string;

  /**
   * .what = whether to roll up the payer (mgmt + members) or just this member
   * .example = 'PAYER' | 'LINKED'
   * .note = part of @unique
   */
  accountScope: string;

  /**
   * .what = an optional predicate to scope the recommendations; null = all
   * .note = part of @unique
   */
  filter: DeclaredAwsCostReportFilter | null;

  /**
   * .what = the roll-up savings summary
   * .note = @readonly — derived from AWS on read
   */
  summary?: DeclaredAwsCostReportRecommendationsToPurchasePlanSummary;

  /**
   * .what = one recommendation per recommended plan
   * .note = @readonly — derived from AWS on read
   */
  recommendations?: DeclaredAwsCostReportRecommendationsToPurchasePlanItem[];
}

export class DeclaredAwsCostReportRecommendationsToPurchasePlan
  extends DomainEntity<DeclaredAwsCostReportRecommendationsToPurchasePlan>
  implements DeclaredAwsCostReportRecommendationsToPurchasePlan
{
  // no primary — derived entity

  /**
   * .what = unique by the recommendation query
   */
  public static unique = [
    'savingsPlansType',
    'termInYears',
    'paymentOption',
    'lookbackDays',
    'accountScope',
    'filter',
  ] as const;

  /**
   * .what = no metadata
   */
  public static metadata = [] as const;

  /**
   * .what = intrinsic attributes resolved from AWS, not user-settable
   */
  public static readonly = ['summary', 'recommendations'] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    filter: DeclaredAwsCostReportFilter,
    summary: DeclaredAwsCostReportRecommendationsToPurchasePlanSummary,
    recommendations: DeclaredAwsCostReportRecommendationsToPurchasePlanItem,
  };
}
