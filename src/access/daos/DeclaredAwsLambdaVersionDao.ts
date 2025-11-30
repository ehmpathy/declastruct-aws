import { DeclastructDao } from 'declastruct';
import { isRefByPrimary, isRefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsLambdaVersion } from '../../domain.objects/DeclaredAwsLambdaVersion';
import { delLambdaVersion } from '../../domain.operations/lambdaVersion/delLambdaVersion';
import { getOneLambdaVersion } from '../../domain.operations/lambdaVersion/getOneLambdaVersion';
import { setLambdaVersion } from '../../domain.operations/lambdaVersion/setLambdaVersion';

/**
 * .what = declastruct DAO for AWS Lambda version resources
 * .why = wraps lambda version operations to conform to declastruct interface
 */
export const DeclaredAwsLambdaVersionDao = new DeclastructDao<
  DeclaredAwsLambdaVersion,
  typeof DeclaredAwsLambdaVersion,
  ContextAwsApi & ContextLogTrail
>({
  get: {
    byPrimary: async (input, context) => {
      return getOneLambdaVersion({ by: { primary: input } }, context);
    },
    byUnique: async (input, context) => {
      return getOneLambdaVersion({ by: { unique: input } }, context);
    },
    byRef: async (input, context) => {
      // route to unique if ref is by unique
      if (isRefByUnique({ of: DeclaredAwsLambdaVersion })(input))
        return getOneLambdaVersion({ by: { unique: input } }, context);

      // route to primary if ref is by primary
      if (isRefByPrimary({ of: DeclaredAwsLambdaVersion })(input))
        return getOneLambdaVersion({ by: { primary: input } }, context);

      // failfast if ref is neither unique nor primary
      UnexpectedCodePathError.throw('unsupported ref type', { input });
    },
  },
  set: {
    finsert: async (input, context) => {
      return setLambdaVersion({ finsert: input }, context);
    },
    upsert: async (input, context) => {
      return setLambdaVersion({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delLambdaVersion({ by: { ref: input } }, context);
    },
  },
});
