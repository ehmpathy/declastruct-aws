import type { GetSavingsPlansPurchaseRecommendationCommandOutput as SdkAwsGetSavingsPlansPurchaseRecommendationCommandOutput } from '@aws-sdk/client-cost-explorer';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { assure } from 'type-fns';

import { DeclaredAwsCostAmount } from '@src/domain.objects/DeclaredAwsCostAmount';
import type { DeclaredAwsCostReportFilter } from '@src/domain.objects/DeclaredAwsCostReportFilter';
import {
  DeclaredAwsCostReportRecommendationsToPurchasePlan,
  DeclaredAwsCostReportRecommendationsToPurchasePlanItem,
  DeclaredAwsCostReportRecommendationsToPurchasePlanSummary,
} from '@src/domain.objects/DeclaredAwsCostReportRecommendationsToPurchasePlan';

/**
 * .what = transforms an aws purchase-plan recommendation response into the domain report
 * .why = maps AWS Summary + the recommendation detail list into per-plan savings items,
 *        amounts kept as strings
 */
export const castIntoDeclaredAwsCostReportRecommendationsToPurchasePlan =
  (input: {
    unique: {
      savingsPlansType: string;
      termInYears: string;
      paymentOption: string;
      lookbackDays: string;
      accountScope: string;
      filter: DeclaredAwsCostReportFilter | null;
    };
    result: SdkAwsGetSavingsPlansPurchaseRecommendationCommandOutput;
  }): HasReadonly<
    typeof DeclaredAwsCostReportRecommendationsToPurchasePlan
  > => {
    const { unique, result } = input;
    const recommendation = result.SavingsPlansPurchaseRecommendation;
    const awsSummary =
      recommendation?.SavingsPlansPurchaseRecommendationSummary;

    // the currency AWS reported the savings in
    const savingsUnit = awsSummary?.CurrencyCode ?? 'USD';

    // the roll-up summary
    const summary =
      DeclaredAwsCostReportRecommendationsToPurchasePlanSummary.as({
        estimatedMonthlySavings: DeclaredAwsCostAmount.as({
          amount: awsSummary?.EstimatedMonthlySavingsAmount ?? '0',
          unit: savingsUnit,
        }),
        estimatedSavingsPercentage:
          awsSummary?.EstimatedSavingsPercentage ?? '0',
        estimatedRoi: awsSummary?.EstimatedROI ?? '0',
        hourlyCommitmentToPurchase:
          awsSummary?.HourlyCommitmentToPurchase ?? '0',
        currentOnDemandSpend: DeclaredAwsCostAmount.as({
          amount: awsSummary?.CurrentOnDemandSpend ?? '0',
          unit: savingsUnit,
        }),
        recommendationCount: Number(
          awsSummary?.TotalRecommendationCount ?? '0',
        ),
      });

    // one item per recommended plan
    //
    // .note = the per-item `EstimatedMonthlySavingsAmount ?? '0'` here is a DELIBERATE
    //   divergence from the peer Rightsize cast, which fails loud on an absent per-item
    //   amount. the reason is a weaker AWS invariant: every field on a purchase-plan
    //   detail is typed optional, with no "exactly one default target" guarantee like
    //   Rightsize's TargetInstances[] carries. so here an absent amount is a genuine
    //   zero-value plan, NOT the impossible-state anomaly it would be for Rightsize — a
    //   fail-loud would reject valid AWS responses. the zero default is correct; the
    //   asymmetry is by design, not an oversight
    const recommendations = (
      recommendation?.SavingsPlansPurchaseRecommendationDetails ?? []
    ).map((detail) => {
      const detailUnit = detail.CurrencyCode ?? savingsUnit;
      return DeclaredAwsCostReportRecommendationsToPurchasePlanItem.as({
        upfrontCost: detail.UpfrontCost ?? '0',
        hourlyCommitmentToPurchase: detail.HourlyCommitmentToPurchase ?? '0',
        estimatedMonthlySavings: DeclaredAwsCostAmount.as({
          amount: detail.EstimatedMonthlySavingsAmount ?? '0',
          unit: detailUnit,
        }),
        estimatedRoi: detail.EstimatedROI ?? '0',
      });
    });

    // cast and assure all readonly fields are present
    return assure(
      DeclaredAwsCostReportRecommendationsToPurchasePlan.as({
        savingsPlansType: unique.savingsPlansType,
        termInYears: unique.termInYears,
        paymentOption: unique.paymentOption,
        lookbackDays: unique.lookbackDays,
        accountScope: unique.accountScope,
        filter: unique.filter,
        summary,
        recommendations,
      }),
      hasReadonly({
        of: DeclaredAwsCostReportRecommendationsToPurchasePlan,
      }),
    );
  };
