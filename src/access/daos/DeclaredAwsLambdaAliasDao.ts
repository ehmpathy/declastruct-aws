import { genDeclastructDao } from 'declastruct';
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
export const DeclaredAwsLambdaAliasDao = genDeclastructDao<
  typeof DeclaredAwsLambdaAlias,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsLambdaAlias,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneLambdaAlias({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getOneLambdaAlias({ by: { unique: input } }, context);
      },
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
