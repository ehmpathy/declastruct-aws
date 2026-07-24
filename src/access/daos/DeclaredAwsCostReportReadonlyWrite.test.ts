import { BadRequestError } from 'helpful-errors';
import { asIsoTimeStamp } from 'iso-time';
import { genLogMethods, LogLevel } from 'sdk-logs';
import { given, then } from 'test-fns';

import { DeclaredAwsCostReportRecommendationsToPurchasePlan } from '@src/domain.objects/DeclaredAwsCostReportRecommendationsToPurchasePlan';
import { DeclaredAwsCostReportRecommendationsToRightsize } from '@src/domain.objects/DeclaredAwsCostReportRecommendationsToRightsize';
import { DeclaredAwsCostReportSpendForecast } from '@src/domain.objects/DeclaredAwsCostReportSpendForecast';
import { DeclaredAwsCostReportSpendObserved } from '@src/domain.objects/DeclaredAwsCostReportSpendObserved';

import { DeclaredAwsCostReportRecommendationsToPurchasePlanDao } from './DeclaredAwsCostReportRecommendationsToPurchasePlanDao';
import { DeclaredAwsCostReportRecommendationsToRightsizeDao } from './DeclaredAwsCostReportRecommendationsToRightsizeDao';
import { DeclaredAwsCostReportSpendForecastDao } from './DeclaredAwsCostReportSpendForecastDao';
import { DeclaredAwsCostReportSpendObservedDao } from './DeclaredAwsCostReportSpendObservedDao';

/**
 * .what = a minimal context — the findsert throws before it reads any of these, so
 *         the values are never used; they exist only to satisfy the DAO signature
 */
const context = {
  aws: {
    credentials: { account: '000000000000', region: 'us-east-1' },
    cache: { DeclaredAwsSsmVpcTunnel: { processes: { dir: '/tmp' } } },
  },
  log: genLogMethods({ level: { minimum: LogLevel.WARN } }),
};

/**
 * .what = proves every read-only cost-report DAO rejects a write (findsert) loud
 * .why = a caller who tries to declare a write on a read-only report must get a
 *        clear, actionable BadRequestError — not silence and not a code-path error.
 *        the throw is synchronous (before any AWS i/o), so this is a pure unit test
 */
describe('cost-report read-only DAOs reject writes', () => {
  given('[case1] a findsert on the observed-spend report DAO', () => {
    const report = DeclaredAwsCostReportSpendObserved.as({
      range: {
        since: asIsoTimeStamp('2026-06-01T00:00:00.000Z'),
        until: asIsoTimeStamp('2026-07-01T00:00:00.000Z'),
      },
      granularity: 'MONTHLY',
      groupBy: { dimension: 'SERVICE' },
      filter: null,
      metric: 'UnblendedCost',
    });

    then('it fails loud with a BadRequestError', async () => {
      await expect(
        DeclaredAwsCostReportSpendObservedDao.set.findsert(report, context),
      ).rejects.toThrow(BadRequestError);
    });

    then('the user-directed fail-loud message snapshot holds', async () => {
      await expect(
        DeclaredAwsCostReportSpendObservedDao.set.findsert(report, context),
      ).rejects.toThrowErrorMatchingSnapshot();
    });
  });

  given('[case2] a findsert on the forecast report DAO', () => {
    const report = DeclaredAwsCostReportSpendForecast.as({
      range: {
        since: asIsoTimeStamp('2026-07-15T00:00:00.000Z'),
        until: asIsoTimeStamp('2026-08-01T00:00:00.000Z'),
      },
      granularity: 'MONTHLY',
      metric: 'UnblendedCost',
      filter: null,
      predictionInterval: 80,
    });

    then('it fails loud with a BadRequestError', async () => {
      await expect(
        DeclaredAwsCostReportSpendForecastDao.set.findsert(report, context),
      ).rejects.toThrow(BadRequestError);
    });

    then('the user-directed fail-loud message snapshot holds', async () => {
      await expect(
        DeclaredAwsCostReportSpendForecastDao.set.findsert(report, context),
      ).rejects.toThrowErrorMatchingSnapshot();
    });
  });

  given('[case3] a findsert on the rightsize-recommendation report DAO', () => {
    const report = DeclaredAwsCostReportRecommendationsToRightsize.as({
      service: 'AmazonEC2',
      recommendationTarget: 'SAME_INSTANCE_FAMILY',
      benefitsConsidered: true,
      filter: null,
    });

    then('it fails loud with a BadRequestError', async () => {
      await expect(
        DeclaredAwsCostReportRecommendationsToRightsizeDao.set.findsert(
          report,
          context,
        ),
      ).rejects.toThrow(BadRequestError);
    });

    then('the user-directed fail-loud message snapshot holds', async () => {
      await expect(
        DeclaredAwsCostReportRecommendationsToRightsizeDao.set.findsert(
          report,
          context,
        ),
      ).rejects.toThrowErrorMatchingSnapshot();
    });
  });

  given(
    '[case4] a findsert on the purchase-plan-recommendation report DAO',
    () => {
      const report = DeclaredAwsCostReportRecommendationsToPurchasePlan.as({
        savingsPlansType: 'COMPUTE_SP',
        termInYears: 'ONE_YEAR',
        paymentOption: 'NO_UPFRONT',
        lookbackDays: 'THIRTY_DAYS',
        accountScope: 'LINKED',
        filter: null,
      });

      then('it fails loud with a BadRequestError', async () => {
        await expect(
          DeclaredAwsCostReportRecommendationsToPurchasePlanDao.set.findsert(
            report,
            context,
          ),
        ).rejects.toThrow(BadRequestError);
      });

      then('the user-directed fail-loud message snapshot holds', async () => {
        await expect(
          DeclaredAwsCostReportRecommendationsToPurchasePlanDao.set.findsert(
            report,
            context,
          ),
        ).rejects.toThrowErrorMatchingSnapshot();
      });
    },
  );
});
