import type { GetSavingsPlansPurchaseRecommendationCommandOutput as SdkAwsGetSavingsPlansPurchaseRecommendationCommandOutput } from '@aws-sdk/client-cost-explorer';
import { given, then } from 'test-fns';

import { castIntoDeclaredAwsCostReportRecommendationsToPurchasePlan } from './castIntoDeclaredAwsCostReportRecommendationsToPurchasePlan';

describe('castIntoDeclaredAwsCostReportRecommendationsToPurchasePlan', () => {
  const baseUnique = {
    savingsPlansType: 'COMPUTE_SP',
    termInYears: 'ONE_YEAR',
    paymentOption: 'NO_UPFRONT',
    lookbackDays: 'THIRTY_DAYS',
    accountScope: 'PAYER',
    filter: null,
  };

  given('[case1] a recommendation with a summary and one plan detail', () => {
    const result: SdkAwsGetSavingsPlansPurchaseRecommendationCommandOutput = {
      $metadata: {},
      SavingsPlansPurchaseRecommendation: {
        SavingsPlansPurchaseRecommendationSummary: {
          EstimatedMonthlySavingsAmount: '4.20',
          EstimatedSavingsPercentage: '12',
          EstimatedROI: '0.30',
          CurrencyCode: 'USD',
          HourlyCommitmentToPurchase: '0.021',
          CurrentOnDemandSpend: '35.00',
          TotalRecommendationCount: '1',
        },
        SavingsPlansPurchaseRecommendationDetails: [
          {
            UpfrontCost: '0',
            HourlyCommitmentToPurchase: '0.021',
            EstimatedMonthlySavingsAmount: '4.20',
            EstimatedROI: '0.30',
            CurrencyCode: 'USD',
          },
        ],
      },
    };

    then('it maps the summary roll-up', () => {
      const report = castIntoDeclaredAwsCostReportRecommendationsToPurchasePlan(
        {
          unique: baseUnique,
          result,
        },
      );
      expect(report.summary?.estimatedMonthlySavings.amount).toBe('4.20');
      expect(report.summary?.estimatedSavingsPercentage).toBe('12');
      expect(report.summary?.estimatedRoi).toBe('0.30');
      expect(report.summary?.hourlyCommitmentToPurchase).toBe('0.021');
      expect(report.summary?.currentOnDemandSpend.amount).toBe('35.00');
      expect(report.summary?.recommendationCount).toBe(1);
    });

    then('it maps the per-plan detail', () => {
      const report = castIntoDeclaredAwsCostReportRecommendationsToPurchasePlan(
        {
          unique: baseUnique,
          result,
        },
      );
      expect(report.recommendations).toHaveLength(1);
      const item = report.recommendations?.[0];
      expect(item?.upfrontCost).toBe('0');
      expect(item?.hourlyCommitmentToPurchase).toBe('0.021');
      expect(item?.estimatedMonthlySavings.amount).toBe('4.20');
      expect(item?.estimatedRoi).toBe('0.30');
    });

    then('it matches the contract snapshot', () => {
      expect(
        castIntoDeclaredAwsCostReportRecommendationsToPurchasePlan({
          unique: baseUnique,
          result,
        }),
      ).toMatchSnapshot();
    });
  });

  given('[case2] an empty recommendation (no plan to buy)', () => {
    const result: SdkAwsGetSavingsPlansPurchaseRecommendationCommandOutput = {
      $metadata: {},
    };

    then('it reads to an empty list and a zero summary', () => {
      const report = castIntoDeclaredAwsCostReportRecommendationsToPurchasePlan(
        {
          unique: baseUnique,
          result,
        },
      );
      expect(report.recommendations).toHaveLength(0);
      expect(report.summary?.estimatedMonthlySavings.amount).toBe('0');
      expect(report.summary?.recommendationCount).toBe(0);
    });

    then('it matches the contract snapshot', () => {
      expect(
        castIntoDeclaredAwsCostReportRecommendationsToPurchasePlan({
          unique: baseUnique,
          result,
        }),
      ).toMatchSnapshot();
    });

    then('it preserves the unique key fields', () => {
      const report = castIntoDeclaredAwsCostReportRecommendationsToPurchasePlan(
        {
          unique: baseUnique,
          result,
        },
      );
      expect(report.savingsPlansType).toBe('COMPUTE_SP');
      expect(report.termInYears).toBe('ONE_YEAR');
      expect(report.paymentOption).toBe('NO_UPFRONT');
      expect(report.lookbackDays).toBe('THIRTY_DAYS');
      expect(report.accountScope).toBe('PAYER');
      expect(report.filter).toBeNull();
    });
  });
});
