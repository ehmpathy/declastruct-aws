import { DeclastructDao } from 'declastruct';
import { isRefByPrimary, isRefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsLambda } from '../../domain.objects/DeclaredAwsLambda';
import { getOneLambda } from '../../domain.operations/lambda/getOneLambda';
import { setLambda } from '../../domain.operations/lambda/setLambda';

/**
 * .what = declastruct DAO for AWS Lambda resources
 * .why = wraps Lambda operations to conform to declastruct interface
 * .note = codeZipUri is required for set operations but not returned from get
 */
export const DeclaredAwsLambdaDao = new DeclastructDao<
  DeclaredAwsLambda,
  typeof DeclaredAwsLambda,
  ContextAwsApi & ContextLogTrail
>({
  get: {
    byPrimary: async (input, context) => {
      return getOneLambda({ by: { primary: input } }, context);
    },
    byUnique: async (input, context) => {
      return getOneLambda({ by: { unique: input } }, context);
    },
    byRef: async (input, context) => {
      // route to unique if ref is by unique
      if (isRefByUnique({ of: DeclaredAwsLambda })(input))
        return getOneLambda({ by: { unique: input } }, context);

      // route to primary if ref is by primary
      if (isRefByPrimary({ of: DeclaredAwsLambda })(input))
        return getOneLambda({ by: { primary: input } }, context);

      // failfast if ref is neither unique nor primary
      UnexpectedCodePathError.throw('unsupported ref type', { input });
    },
  },
  set: {
    finsert: async (input, context) => {
      return setLambda({ finsert: input }, context);
    },
    upsert: async (input, context) => {
      return setLambda({ upsert: input }, context);
    },
  },
});
