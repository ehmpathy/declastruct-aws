import { DeclastructDao } from 'declastruct';
import { isRefByPrimary, isRefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsLambdaAlias } from '../../domain.objects/DeclaredAwsLambdaAlias';
import { delLambdaAlias } from '../../domain.operations/lambdaAlias/delLambdaAlias';
import { getOneLambdaAlias } from '../../domain.operations/lambdaAlias/getOneLambdaAlias';
import { setLambdaAlias } from '../../domain.operations/lambdaAlias/setLambdaAlias';

/**
 * .what = declastruct DAO for AWS Lambda alias resources
 * .why = wraps lambda alias operations to conform to declastruct interface
 */
export const DeclaredAwsLambdaAliasDao = new DeclastructDao<
  DeclaredAwsLambdaAlias,
  typeof DeclaredAwsLambdaAlias,
  ContextAwsApi & ContextLogTrail
>({
  get: {
    byPrimary: async (input, context) => {
      return getOneLambdaAlias({ by: { primary: input } }, context);
    },
    byUnique: async (input, context) => {
      return getOneLambdaAlias({ by: { unique: input } }, context);
    },
    byRef: async (input, context) => {
      // route to unique if ref is by unique
      if (isRefByUnique({ of: DeclaredAwsLambdaAlias })(input))
        return getOneLambdaAlias({ by: { unique: input } }, context);

      // route to primary if ref is by primary
      if (isRefByPrimary({ of: DeclaredAwsLambdaAlias })(input))
        return getOneLambdaAlias({ by: { primary: input } }, context);

      // failfast if ref is neither unique nor primary
      UnexpectedCodePathError.throw('unsupported ref type', { input });
    },
  },
  set: {
    finsert: async (input, context) => {
      return setLambdaAlias({ finsert: input }, context);
    },
    upsert: async (input, context) => {
      return setLambdaAlias({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delLambdaAlias({ by: { ref: input } }, context);
    },
  },
});
