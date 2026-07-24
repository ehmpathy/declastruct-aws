import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsCostReportSpendObservedByResource } from '@src/domain.objects/DeclaredAwsCostReportSpendObservedByResource';
import { getOneCostReportSpendObservedByResource } from '@src/domain.operations/costReportSpendObservedByResource/getOneCostReportSpendObservedByResource';

import { genDeclastructReadonlyReportDao } from './genDeclastructReadonlyReportDao';

/**
 * .what = declastruct DAO for by-RESOURCE_ID observed-spend cost reports
 * .why = wraps the report read op to conform to the declastruct interface
 * .note = read-only derived entity — no set operations (see genDeclastructReadonlyReportDao)
 */
export const DeclaredAwsCostReportSpendObservedByResourceDao =
  genDeclastructReadonlyReportDao<
    typeof DeclaredAwsCostReportSpendObservedByResource,
    ContextAwsApi & ContextLogTrail
  >({
    dobj: DeclaredAwsCostReportSpendObservedByResource,
    label: 'by-resource observed-spend report',
    getOne: getOneCostReportSpendObservedByResource,
  });
