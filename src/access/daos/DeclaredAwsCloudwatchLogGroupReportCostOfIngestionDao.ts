import { genDeclastructDao } from 'declastruct';
import { BadRequestError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsCloudwatchLogGroupReportCostOfIngestion } from '@src/domain.objects/DeclaredAwsCloudwatchLogGroupReportCostOfIngestion';
import { getOneCloudwatchLogGroupReportCostOfIngestion } from '@src/domain.operations/cloudwatchLogGroupReportCostOfIngestion/getOneCloudwatchLogGroupReportCostOfIngestion';

/**
 * .what = declastruct DAO for log group ingestion cost reports
 * .why = wraps report operations to conform to declastruct interface
 * .note = no set operations — readonly derived entity
 */
export const DeclaredAwsCloudwatchLogGroupReportCostOfIngestionDao =
  genDeclastructDao<
    typeof DeclaredAwsCloudwatchLogGroupReportCostOfIngestion,
    ContextAwsApi & ContextLogTrail
  >({
    dobj: DeclaredAwsCloudwatchLogGroupReportCostOfIngestion,
    get: {
      one: {
        byPrimary: null,
        byUnique: async (input, context) => {
          return getOneCloudwatchLogGroupReportCostOfIngestion(
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
