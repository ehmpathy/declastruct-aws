import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsLambdaAlias } from '@src/domain.objects/DeclaredAwsLambdaAlias';
import { delLambdaAlias } from '@src/domain.operations/lambdaAlias/delLambdaAlias';
import { getOneLambdaAlias } from '@src/domain.operations/lambdaAlias/getOneLambdaAlias';
import { setLambdaAlias } from '@src/domain.operations/lambdaAlias/setLambdaAlias';

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
    findsert: async (input, context) => {
      return setLambdaAlias({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setLambdaAlias({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delLambdaAlias({ by: { ref: input } }, context);
    },
  },
});
