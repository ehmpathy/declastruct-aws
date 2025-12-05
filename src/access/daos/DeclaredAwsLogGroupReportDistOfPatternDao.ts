import { DeclastructDao } from 'declastruct';
import { isRefByUnique } from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsLogGroupReportDistOfPattern } from '../../domain.objects/DeclaredAwsLogGroupReportDistOfPattern';
import { getOneLogGroupReportDistOfPattern } from '../../domain.operations/logGroupReportDistOfPattern/getOneLogGroupReportDistOfPattern';

/**
 * .what = declastruct DAO for log group pattern distribution reports
 * .why = wraps report operations to conform to declastruct interface
 * .note = no set operations — readonly derived entity
 */
export const DeclaredAwsLogGroupReportDistOfPatternDao = new DeclastructDao<
  DeclaredAwsLogGroupReportDistOfPattern,
  typeof DeclaredAwsLogGroupReportDistOfPattern,
  ContextAwsApi & ContextLogTrail
>({
  get: {
    // no byPrimary — entity has no primary key
    byUnique: async (input, context) => {
      return getOneLogGroupReportDistOfPattern(
        { by: { unique: input } },
        context,
      );
    },
    byRef: async (input, context) => {
      // route to unique if ref is by unique
      if (isRefByUnique({ of: DeclaredAwsLogGroupReportDistOfPattern })(input))
        return getOneLogGroupReportDistOfPattern(
          { by: { unique: input } },
          context,
        );

      // failfast if ref is not unique (no primary key for this entity)
      UnexpectedCodePathError.throw(
        'unsupported ref type — entity has no primary key',
        { input },
      );
    },
  },
  set: {
    finsert: async (input) => {
      // readonly derived entity — cannot be written
      BadRequestError.throw(
        'Pattern distribution report is a readonly derived entity — cannot be written',
        { input },
      );
    },
  },
});
