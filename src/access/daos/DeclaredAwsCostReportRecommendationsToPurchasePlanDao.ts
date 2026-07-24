import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsCostReportRecommendationsToPurchasePlan } from '@src/domain.objects/DeclaredAwsCostReportRecommendationsToPurchasePlan';
import { getOneCostReportRecommendationsToPurchasePlan } from '@src/domain.operations/costReportRecommendationsToPurchasePlan/getOneCostReportRecommendationsToPurchasePlan';

import { genDeclastructReadonlyReportDao } from './genDeclastructReadonlyReportDao';

/**
 * .what = declastruct DAO for purchase-plan-savings cost reports
 * .why = wraps the recommendation read op to conform to the declastruct interface
 * .note = read-only derived entity — no set operations (see genDeclastructReadonlyReportDao)
 */
export const DeclaredAwsCostReportRecommendationsToPurchasePlanDao =
  genDeclastructReadonlyReportDao<
    typeof DeclaredAwsCostReportRecommendationsToPurchasePlan,
    ContextAwsApi & ContextLogTrail
  >({
    dobj: DeclaredAwsCostReportRecommendationsToPurchasePlan,
    label: 'purchase-plan-savings report',
    getOne: getOneCostReportRecommendationsToPurchasePlan,
  });
