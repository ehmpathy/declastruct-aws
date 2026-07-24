import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsCostReportSpendObserved } from '@src/domain.objects/DeclaredAwsCostReportSpendObserved';
import { getOneCostReportSpendObserved } from '@src/domain.operations/costReportSpendObserved/getOneCostReportSpendObserved';

import { genDeclastructReadonlyReportDao } from './genDeclastructReadonlyReportDao';

/**
 * .what = declastruct DAO for observed-spend cost reports
 * .why = wraps the report read op to conform to the declastruct interface
 * .note = read-only derived entity — no set operations (see genDeclastructReadonlyReportDao)
 */
export const DeclaredAwsCostReportSpendObservedDao =
  genDeclastructReadonlyReportDao<
    typeof DeclaredAwsCostReportSpendObserved,
    ContextAwsApi & ContextLogTrail
  >({
    dobj: DeclaredAwsCostReportSpendObserved,
    label: 'observed-spend report',
    getOne: getOneCostReportSpendObserved,
  });
