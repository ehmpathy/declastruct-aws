import type { GetRightsizingRecommendationCommandOutput as SdkAwsGetRightsizingRecommendationCommandOutput } from '@aws-sdk/client-cost-explorer';
import { given, then } from 'test-fns';

import { castIntoDeclaredAwsCostReportRecommendationsToRightsize } from './castIntoDeclaredAwsCostReportRecommendationsToRightsize';

describe('castIntoDeclaredAwsCostReportRecommendationsToRightsize', () => {
  const baseUnique = {
    service: 'AmazonEC2',
    recommendationTarget: 'SAME_INSTANCE_FAMILY',
    benefitsConsidered: true,
    filter: null,
  };

  given(
    '[case1] a recommendation set with a Modify and a Terminate action',
    () => {
      const result: SdkAwsGetRightsizingRecommendationCommandOutput = {
        $metadata: {},
        Summary: {
          EstimatedTotalMonthlySavingsAmount: '8.10',
          SavingsPercentage: '18',
          SavingsCurrencyCode: 'USD',
          TotalRecommendationCount: '2',
        },
        Metadata: { LookbackPeriodInDays: 'THIRTY_DAYS' },
        RightsizingRecommendations: [
          {
            RightsizingType: 'MODIFY',
            CurrentInstance: {
              ResourceId: 'i-modify',
              MonthlyCost: '20.00',
              CurrencyCode: 'USD',
            },
            ModifyRecommendationDetail: {
              TargetInstances: [
                {
                  DefaultTargetInstance: true,
                  EstimatedMonthlySavings: '8.10',
                },
                {
                  DefaultTargetInstance: false,
                  EstimatedMonthlySavings: '1.00',
                },
              ],
            },
          },
          {
            RightsizingType: 'TERMINATE',
            CurrentInstance: {
              ResourceId: 'i-terminate',
              MonthlyCost: '5.00',
              CurrencyCode: 'USD',
            },
            TerminateRecommendationDetail: {
              EstimatedMonthlySavings: '5.00',
            },
          },
        ],
      };

      then('it maps the summary roll-up', () => {
        const report = castIntoDeclaredAwsCostReportRecommendationsToRightsize({
          unique: baseUnique,
          result,
        });
        expect(report.summary?.estimatedMonthlySavings.amount).toBe('8.10');
        expect(report.summary?.savingsPercentage).toBe('18');
        expect(report.summary?.recommendationCount).toBe(2);
      });

      then('it maps the AWS lookback-window enum to a day count', () => {
        const report = castIntoDeclaredAwsCostReportRecommendationsToRightsize({
          unique: baseUnique,
          result,
        });
        expect(report.lookbackDays).toBe(30);
      });

      then('a Modify uses the default target instance savings', () => {
        const report = castIntoDeclaredAwsCostReportRecommendationsToRightsize({
          unique: baseUnique,
          result,
        });
        const modify = report.recommendations?.find(
          (rec) => rec.resourceId === 'i-modify',
        );
        expect(modify?.action).toBe('MODIFY');
        expect(modify?.currentMonthlyCost.amount).toBe('20.00');
        expect(modify?.estimatedMonthlySavings?.amount).toBe('8.10');
      });

      then('a Terminate uses the terminate-detail savings', () => {
        const report = castIntoDeclaredAwsCostReportRecommendationsToRightsize({
          unique: baseUnique,
          result,
        });
        const terminate = report.recommendations?.find(
          (rec) => rec.resourceId === 'i-terminate',
        );
        expect(terminate?.action).toBe('TERMINATE');
        expect(terminate?.estimatedMonthlySavings?.amount).toBe('5.00');
      });

      then('it matches the contract snapshot', () => {
        expect(
          castIntoDeclaredAwsCostReportRecommendationsToRightsize({
            unique: baseUnique,
            result,
          }),
        ).toMatchSnapshot();
      });
    },
  );

  given('[case2] an empty recommendation set (a low-usage account)', () => {
    const result: SdkAwsGetRightsizingRecommendationCommandOutput = {
      $metadata: {},
      RightsizingRecommendations: [],
    };

    then('it reads to an empty list and a zero summary', () => {
      const report = castIntoDeclaredAwsCostReportRecommendationsToRightsize({
        unique: baseUnique,
        result,
      });
      expect(report.recommendations).toHaveLength(0);
      expect(report.summary?.estimatedMonthlySavings.amount).toBe('0');
      expect(report.summary?.recommendationCount).toBe(0);
    });

    then('it matches the contract snapshot', () => {
      expect(
        castIntoDeclaredAwsCostReportRecommendationsToRightsize({
          unique: baseUnique,
          result,
        }),
      ).toMatchSnapshot();
    });

    then('it preserves the unique key fields', () => {
      const report = castIntoDeclaredAwsCostReportRecommendationsToRightsize({
        unique: baseUnique,
        result,
      });
      expect(report.service).toBe('AmazonEC2');
      expect(report.recommendationTarget).toBe('SAME_INSTANCE_FAMILY');
      expect(report.benefitsConsidered).toBe(true);
      expect(report.filter).toBeNull();
    });
  });

  given(
    '[case3] a MODIFY rec with an anomalous shape (targets but no default)',
    () => {
      // this is the r11-i015 blast-radius fix: an unreadable savings shape must NOT
      // abort the whole shared plan (a throw), NOR mask real data (a false '0'). it
      // degrades to a null sentinel the reader surfaces as "savings unknown"
      const result: SdkAwsGetRightsizingRecommendationCommandOutput = {
        $metadata: {},
        Summary: {
          EstimatedTotalMonthlySavingsAmount: '0',
          SavingsPercentage: '0',
          SavingsCurrencyCode: 'USD',
          TotalRecommendationCount: '1',
        },
        RightsizingRecommendations: [
          {
            RightsizingType: 'MODIFY',
            CurrentInstance: {
              ResourceId: 'i-anomalous',
              MonthlyCost: '20.00',
              CurrencyCode: 'USD',
            },
            ModifyRecommendationDetail: {
              TargetInstances: [
                {
                  DefaultTargetInstance: false,
                  EstimatedMonthlySavings: '1.00',
                },
              ],
            },
          },
        ],
      };

      then('it never throws (would abort the whole shared plan)', () => {
        expect(() =>
          castIntoDeclaredAwsCostReportRecommendationsToRightsize({
            unique: baseUnique,
            result,
          }),
        ).not.toThrow();
      });

      then('the anomalous rec reads null savings, not a false zero', () => {
        const report = castIntoDeclaredAwsCostReportRecommendationsToRightsize({
          unique: baseUnique,
          result,
        });
        const anomalous = report.recommendations?.find(
          (rec) => rec.resourceId === 'i-anomalous',
        );
        expect(anomalous?.action).toBe('MODIFY');
        expect(anomalous?.currentMonthlyCost.amount).toBe('20.00');
        expect(anomalous?.estimatedMonthlySavings).toBeNull();
      });
    },
  );
});
