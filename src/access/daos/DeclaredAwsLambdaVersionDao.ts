import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsLambdaVersion } from '../../domain.objects/DeclaredAwsLambdaVersion';
import { delLambdaVersion } from '../../domain.operations/lambdaVersion/delLambdaVersion';
import { getOneLambdaVersion } from '../../domain.operations/lambdaVersion/getOneLambdaVersion';
import { setLambdaVersion } from '../../domain.operations/lambdaVersion/setLambdaVersion';

/**
 * .what = declastruct DAO for AWS Lambda version resources
 * .why = wraps lambda version operations to conform to declastruct interface
 */
export const DeclaredAwsLambdaVersionDao = genDeclastructDao<
  typeof DeclaredAwsLambdaVersion,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsLambdaVersion,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneLambdaVersion({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getOneLambdaVersion({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setLambdaVersion({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setLambdaVersion({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delLambdaVersion({ by: { ref: input } }, context);
    },
  },
});
