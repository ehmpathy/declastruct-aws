import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsCostReportRecommendationsToRightsize } from '@src/domain.objects/DeclaredAwsCostReportRecommendationsToRightsize';
import { getOneCostReportRecommendationsToRightsize } from '@src/domain.operations/costReportRecommendationsToRightsize/getOneCostReportRecommendationsToRightsize';

import { genDeclastructReadonlyReportDao } from './genDeclastructReadonlyReportDao';

/**
 * .what = declastruct DAO for rightsize-savings cost reports
 * .why = wraps the recommendation read op to conform to the declastruct interface
 * .note = read-only derived entity — no set operations (see genDeclastructReadonlyReportDao)
 */
export const DeclaredAwsCostReportRecommendationsToRightsizeDao =
  genDeclastructReadonlyReportDao<
    typeof DeclaredAwsCostReportRecommendationsToRightsize,
    ContextAwsApi & ContextLogTrail
  >({
    dobj: DeclaredAwsCostReportRecommendationsToRightsize,
    label: 'rightsize-savings report',
    getOne: getOneCostReportRecommendationsToRightsize,
  });
