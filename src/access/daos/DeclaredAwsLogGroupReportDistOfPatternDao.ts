import { genDeclastructDao } from 'declastruct';
import { BadRequestError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsLogGroupReportDistOfPattern } from '../../domain.objects/DeclaredAwsLogGroupReportDistOfPattern';
import { getOneLogGroupReportDistOfPattern } from '../../domain.operations/logGroupReportDistOfPattern/getOneLogGroupReportDistOfPattern';

/**
 * .what = declastruct DAO for log group pattern distribution reports
 * .why = wraps report operations to conform to declastruct interface
 * .note = no set operations — readonly derived entity
 */
export const DeclaredAwsLogGroupReportDistOfPatternDao = genDeclastructDao<
  typeof DeclaredAwsLogGroupReportDistOfPattern,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsLogGroupReportDistOfPattern,
  get: {
    one: {
      byPrimary: null,
      byUnique: async (input, context) => {
        return getOneLogGroupReportDistOfPattern(
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
