import { genDeclastructDao } from 'declastruct';
import { BadRequestError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsCloudwatchLogGroupReportDistOfPattern } from '@src/domain.objects/DeclaredAwsCloudwatchLogGroupReportDistOfPattern';
import { getOneCloudwatchLogGroupReportDistOfPattern } from '@src/domain.operations/cloudwatchLogGroupReportDistOfPattern/getOneCloudwatchLogGroupReportDistOfPattern';

/**
 * .what = declastruct DAO for log group pattern distribution reports
 * .why = wraps report operations to conform to declastruct interface
 * .note = no set operations — readonly derived entity
 */
export const DeclaredAwsCloudwatchLogGroupReportDistOfPatternDao =
  genDeclastructDao<
    typeof DeclaredAwsCloudwatchLogGroupReportDistOfPattern,
    ContextAwsApi & ContextLogTrail
  >({
    dobj: DeclaredAwsCloudwatchLogGroupReportDistOfPattern,
    get: {
      one: {
        byPrimary: null,
        byUnique: async (input, context) => {
          return getOneCloudwatchLogGroupReportDistOfPattern(
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
          'Pattern distribution report is a readonly derived entity — cannot be written',
          { input },
        );
      },
      upsert: null,
      delete: null,
    },
  });
