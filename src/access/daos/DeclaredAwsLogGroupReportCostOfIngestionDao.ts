import { genDeclastructDao } from 'declastruct';
import { BadRequestError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsLogGroupReportCostOfIngestion } from '@src/domain.objects/DeclaredAwsLogGroupReportCostOfIngestion';
import { getOneLogGroupReportCostOfIngestion } from '@src/domain.operations/logGroupReportCostOfIngestion/getOneLogGroupReportCostOfIngestion';

/**
 * .what = declastruct DAO for log group ingestion cost reports
 * .why = wraps report operations to conform to declastruct interface
 * .note = no set operations — readonly derived entity
 */
export const DeclaredAwsLogGroupReportCostOfIngestionDao = genDeclastructDao<
  typeof DeclaredAwsLogGroupReportCostOfIngestion,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsLogGroupReportCostOfIngestion,
  get: {
    one: {
      byPrimary: null,
      byUnique: async (input, context) => {
        return getOneLogGroupReportCostOfIngestion(
          { by: { unique: input } },
          context,
        );
      },
    },
  },
  set: {
    findsert: async (input) => {
      // readonly derived entity — cannot be written
      BadRequestError.throw(
        'Cost of ingestion report is a readonly derived entity — cannot be written',
        { input },
      );
    },
    upsert: null,
    delete: null,
  },
});
