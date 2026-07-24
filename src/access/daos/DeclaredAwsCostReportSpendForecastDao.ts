import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsCostReportSpendForecast } from '@src/domain.objects/DeclaredAwsCostReportSpendForecast';
import { getOneCostReportSpendForecast } from '@src/domain.operations/costReportSpendForecast/getOneCostReportSpendForecast';

import { genDeclastructReadonlyReportDao } from './genDeclastructReadonlyReportDao';

/**
 * .what = declastruct DAO for forecast-spend cost reports
 * .why = wraps the forecast read op to conform to the declastruct interface
 * .note = read-only derived entity — no set operations (see genDeclastructReadonlyReportDao)
 */
export const DeclaredAwsCostReportSpendForecastDao =
  genDeclastructReadonlyReportDao<
    typeof DeclaredAwsCostReportSpendForecast,
    ContextAwsApi & ContextLogTrail
  >({
    dobj: DeclaredAwsCostReportSpendForecast,
    label: 'forecast-spend report',
    getOne: getOneCostReportSpendForecast,
  });
