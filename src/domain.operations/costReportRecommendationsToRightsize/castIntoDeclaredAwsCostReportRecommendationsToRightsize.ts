import type { GetRightsizingRecommendationCommandOutput as SdkAwsGetRightsizingRecommendationCommandOutput } from '@aws-sdk/client-cost-explorer';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { assure } from 'type-fns';

import { DeclaredAwsCostAmount } from '@src/domain.objects/DeclaredAwsCostAmount';
import type { DeclaredAwsCostReportFilter } from '@src/domain.objects/DeclaredAwsCostReportFilter';
import {
  DeclaredAwsCostReportRecommendationsToRightsize,
  DeclaredAwsCostReportRecommendationsToRightsizeItem,
  DeclaredAwsCostReportRecommendationsToRightsizeSummary,
} from '@src/domain.objects/DeclaredAwsCostReportRecommendationsToRightsize';

import { asRightsizeSavingsAmount } from './asRightsizeSavingsAmount';

/**
 * .what = maps AWS's LookbackPeriodInDays enum to a day count
 * .why = AWS reports the lookback window as an enum (SEVEN/THIRTY/SIXTY), but the
 *        domain models it as the plain day count it names
 */
const asLookbackDays = (input: { period: string | undefined }): number => {
  const byPeriod: Record<string, number> = {
    SEVEN_DAYS: 7,
    THIRTY_DAYS: 30,
    SIXTY_DAYS: 60,
  };
  return input.period ? (byPeriod[input.period] ?? 0) : 0;
};

/**
 * .what = transforms an aws rightsize-recommendation response into the domain report
 * .why = maps AWS Summary + the recommendation list into per-box savings items,
 *        amounts kept as strings
 */
export const castIntoDeclaredAwsCostReportRecommendationsToRightsize = (input: {
  unique: {
    service: string;
    recommendationTarget: string;
    benefitsConsidered: boolean;
    filter: DeclaredAwsCostReportFilter | null;
  };
  result: SdkAwsGetRightsizingRecommendationCommandOutput;
}): HasReadonly<typeof DeclaredAwsCostReportRecommendationsToRightsize> => {
  const { unique, result } = input;

  // the currency AWS reported the savings in
  const savingsUnit = result.Summary?.SavingsCurrencyCode ?? 'USD';

  // the roll-up summary
  // .note = the `?? '0'` on these TOP-LEVEL summary scalars is SAFE, unlike the per-item
  //         MODIFY savings (which degrades to a null sentinel via asRightsizeSavingsAmount).
  //         AWS omits the summary total ONLY when there is genuinely no recommendation (an
  //         empty account) — so absence here means a true zero, not a broken-shape anomaly.
  //         the per-item case differs: a MODIFY WITH target instances but no readable
  //         default is an anomaly that a silent '0' would mask, so it reads null (unknown)
  //         instead — never a false zero, never a throw (see asRightsizeSavingsAmount.note)
  const summary = DeclaredAwsCostReportRecommendationsToRightsizeSummary.as({
    estimatedMonthlySavings: DeclaredAwsCostAmount.as({
      amount: result.Summary?.EstimatedTotalMonthlySavingsAmount ?? '0',
      unit: savingsUnit,
    }),
    savingsPercentage: result.Summary?.SavingsPercentage ?? '0',
    recommendationCount: Number(
      result.Summary?.TotalRecommendationCount ?? '0',
    ),
  });

  // one item per recommended box
  const recommendations = (result.RightsizingRecommendations ?? []).map(
    (rec) => {
      const current = rec.CurrentInstance;
      const currentUnit = current?.CurrencyCode ?? savingsUnit;

      // the estimated savings depend on the action (TERMINATE vs MODIFY). an anomalous
      // AWS shape (no readable default target) yields null — the caller logs loud per
      // null; a null reads "savings unknown", never a false zero, never a plan-abort throw
      const savingsAmount = asRightsizeSavingsAmount({ rec });

      return DeclaredAwsCostReportRecommendationsToRightsizeItem.as({
        resourceId: current?.ResourceId ?? '',
        action: rec.RightsizingType ?? 'MODIFY',
        currentMonthlyCost: DeclaredAwsCostAmount.as({
          amount: current?.MonthlyCost ?? '0',
          unit: currentUnit,
        }),
        estimatedMonthlySavings:
          savingsAmount === null
            ? null
            : DeclaredAwsCostAmount.as({
                amount: savingsAmount,
                unit: savingsUnit,
              }),
      });
    },
  );

  // the lookback window AWS chose (reported as an enum in Metadata)
  const lookbackDays = asLookbackDays({
    period: result.Metadata?.LookbackPeriodInDays,
  });

  // cast and assure all readonly fields are present
  return assure(
    DeclaredAwsCostReportRecommendationsToRightsize.as({
      service: unique.service,
      recommendationTarget: unique.recommendationTarget,
      benefitsConsidered: unique.benefitsConsidered,
      filter: unique.filter,
      summary,
      lookbackDays,
      recommendations,
    }),
    hasReadonly({
      of: DeclaredAwsCostReportRecommendationsToRightsize,
    }),
  );
};
