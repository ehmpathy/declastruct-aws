import { DeclastructDao } from 'declastruct';
import { isRefByUnique } from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsLogGroupReportCostOfIngestion } from '../../domain.objects/DeclaredAwsLogGroupReportCostOfIngestion';
import { getOneLogGroupReportCostOfIngestion } from '../../domain.operations/logGroupReportCostOfIngestion/getOneLogGroupReportCostOfIngestion';

/**
 * .what = declastruct DAO for log group ingestion cost reports
 * .why = wraps report operations to conform to declastruct interface
 * .note = no set operations — readonly derived entity
 */
export const DeclaredAwsLogGroupReportCostOfIngestionDao = new DeclastructDao<
  DeclaredAwsLogGroupReportCostOfIngestion,
  typeof DeclaredAwsLogGroupReportCostOfIngestion,
  ContextAwsApi & ContextLogTrail
>({
  get: {
    // no byPrimary — entity has no primary key
    byUnique: async (input, context) => {
      return getOneLogGroupReportCostOfIngestion(
        { by: { unique: input } },
        context,
      );
    },
    byRef: async (input, context) => {
      // route to unique if ref is by unique
      if (
        isRefByUnique({ of: DeclaredAwsLogGroupReportCostOfIngestion })(input)
      )
        return getOneLogGroupReportCostOfIngestion(
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
        'Cost of ingestion report is a readonly derived entity — cannot be written',
        { input },
      );
    },
  },
});
