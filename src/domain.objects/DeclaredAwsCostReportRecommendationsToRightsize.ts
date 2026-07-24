import { DomainEntity, DomainLiteral } from 'domain-objects';

import { DeclaredAwsCostAmount } from './DeclaredAwsCostAmount';
import { DeclaredAwsCostReportFilter } from './DeclaredAwsCostReportFilter';

/**
 * .what = a single rightsize recommendation for one EC2 resource
 * .why = each names the box, the action (resize or terminate), its current cost,
 *        and the estimated monthly savings
 */
export interface DeclaredAwsCostReportRecommendationsToRightsizeItem {
  /**
   * .what = the EC2 resource id the recommendation targets
   */
  resourceId: string;

  /**
   * .what = the recommended action — the AWS `RightsizingType` enum, verbatim
   * .example = 'MODIFY' (downsize) | 'TERMINATE' (kill idle)
   */
  action: string;

  /**
   * .what = the current monthly cost of the resource
   */
  currentMonthlyCost: DeclaredAwsCostAmount;

  /**
   * .what = the estimated monthly savings if the action is taken; null when AWS
   *         returned an anomalous rec shape whose savings cannot be read
   * .why = null is a DELIBERATE sentinel, distinct from `{ amount: '0' }`. a MODIFY rec
   *        with target instances but none flagged DefaultTargetInstance (or a TERMINATE
   *        rec with no detail) is a shape AWS's own api can emit; a silent '0' there would
   *        MASK a real recommendation (failhide), but a hard throw would abort the entire
   *        shared declastruct plan (blast radius — planChanges has no per-resource catch).
   *        so an unreadable savings degrades to null: the box still appears (not dropped),
   *        the savings reads "unknown" (not a false zero), and the plan never aborts. the
   *        read composite logs loud per null item, so the degrade is observable, never
   *        silently swallowed
   */
  estimatedMonthlySavings: DeclaredAwsCostAmount | null;
}

export class DeclaredAwsCostReportRecommendationsToRightsizeItem
  extends DomainLiteral<DeclaredAwsCostReportRecommendationsToRightsizeItem>
  implements DeclaredAwsCostReportRecommendationsToRightsizeItem
{
  public static nested = {
    currentMonthlyCost: DeclaredAwsCostAmount,
    estimatedMonthlySavings: DeclaredAwsCostAmount,
  };
}

/**
 * .what = the roll-up summary of a rightsize recommendation set
 */
export interface DeclaredAwsCostReportRecommendationsToRightsizeSummary {
  /**
   * .what = the total estimated monthly savings across all recommendations
   */
  estimatedMonthlySavings: DeclaredAwsCostAmount;

  /**
   * .what = the savings as a percentage of the covered spend
   */
  savingsPercentage: string;

  /**
   * .what = the count of recommendations
   */
  recommendationCount: number;
}

export class DeclaredAwsCostReportRecommendationsToRightsizeSummary
  extends DomainLiteral<DeclaredAwsCostReportRecommendationsToRightsizeSummary>
  implements DeclaredAwsCostReportRecommendationsToRightsizeSummary
{
  public static nested = {
    estimatedMonthlySavings: DeclaredAwsCostAmount,
  };
}

/**
 * .what = a read-only report of where we can SAVE money by resize of EC2
 * .why = answers "where can we save money?" — idle/oversized EC2, each with a
 *        resize/terminate action + estimated savings, via the AWS rightsize api
 *
 * .identity
 *   - @unique = [service, recommendationTarget, benefitsConsidered, filter]
 *   - no @primary — this is a computed/derived entity
 *   - NO range — AWS derives the lookback window itself (reported as lookbackDays)
 *
 * .note
 *   - read-only: getOne composite only, no set/del
 *   - service is 'AmazonEC2' only today (the sole value AWS accepts)
 */
export interface DeclaredAwsCostReportRecommendationsToRightsize {
  /**
   * .what = the AWS service to recommend for
   * .example = 'AmazonEC2' (the only value AWS accepts today)
   * .note = part of @unique
   */
  service: string;

  /**
   * .what = whether to recommend within the same instance family or across
   * .example = 'SAME_INSTANCE_FAMILY' | 'CROSS_INSTANCE_FAMILY'
   * .note = part of @unique
   */
  recommendationTarget: string;

  /**
   * .what = whether estimated savings net out extant Savings-Plans/RI benefit
   * .note = part of @unique
   */
  benefitsConsidered: boolean;

  /**
   * .what = an optional predicate to scope the recommendations; null = all
   * .note = part of @unique. dimensions limited to LINKED_ACCOUNT/REGION/RIGHTSIZING_TYPE
   */
  filter: DeclaredAwsCostReportFilter | null;

  /**
   * .what = the roll-up savings summary
   * .note = @readonly — derived from AWS on read
   */
  summary?: DeclaredAwsCostReportRecommendationsToRightsizeSummary;

  /**
   * .what = the lookback window (in days) AWS used to compute the recommendations
   * .note = @readonly — AWS-chosen, reported back
   */
  lookbackDays?: number;

  /**
   * .what = one recommendation per oversized/idle box
   * .note = @readonly — derived from AWS on read
   */
  recommendations?: DeclaredAwsCostReportRecommendationsToRightsizeItem[];
}

export class DeclaredAwsCostReportRecommendationsToRightsize
  extends DomainEntity<DeclaredAwsCostReportRecommendationsToRightsize>
  implements DeclaredAwsCostReportRecommendationsToRightsize
{
  // no primary — derived entity

  /**
   * .what = unique by the recommendation query
   */
  public static unique = [
    'service',
    'recommendationTarget',
    'benefitsConsidered',
    'filter',
  ] as const;

  /**
   * .what = no metadata
   */
  public static metadata = [] as const;

  /**
   * .what = intrinsic attributes resolved from AWS, not user-settable
   */
  public static readonly = [
    'summary',
    'lookbackDays',
    'recommendations',
  ] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    filter: DeclaredAwsCostReportFilter,
    summary: DeclaredAwsCostReportRecommendationsToRightsizeSummary,
    recommendations: DeclaredAwsCostReportRecommendationsToRightsizeItem,
  };
}
