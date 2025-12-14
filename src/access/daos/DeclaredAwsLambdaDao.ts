import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsLambda } from '../../domain.objects/DeclaredAwsLambda';
import { getOneLambda } from '../../domain.operations/lambda/getOneLambda';
import { setLambda } from '../../domain.operations/lambda/setLambda';

/**
 * .what = declastruct DAO for AWS Lambda resources
 * .why = wraps Lambda operations to conform to declastruct interface
 * .note = codeZipUri is required for set operations but not returned from get
 */
export const DeclaredAwsLambdaDao = genDeclastructDao<
  typeof DeclaredAwsLambda,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsLambda,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneLambda({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getOneLambda({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    finsert: async (input, context) => {
      return setLambda({ finsert: input }, context);
    },
    upsert: async (input, context) => {
      return setLambda({ upsert: input }, context);
    },
    delete: null,
  },
});
