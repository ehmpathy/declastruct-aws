import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsLogGroup } from '@src/domain.objects/DeclaredAwsLogGroup';
import { getOneLogGroup } from '@src/domain.operations/logGroup/getOneLogGroup';
import { setLogGroup } from '@src/domain.operations/logGroup/setLogGroup';

/**
 * .what = declastruct DAO for AWS CloudWatch Log Group resources
 * .why = wraps Log Group operations to conform to declastruct interface
 */
export const DeclaredAwsLogGroupDao = genDeclastructDao<
  typeof DeclaredAwsLogGroup,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsLogGroup,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneLogGroup({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getOneLogGroup({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setLogGroup({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setLogGroup({ upsert: input }, context);
    },
    delete: null,
  },
});
