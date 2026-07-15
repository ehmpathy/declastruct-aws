import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsCloudwatchLogGroup } from '@src/domain.objects/DeclaredAwsCloudwatchLogGroup';
import { getOneCloudwatchLogGroup } from '@src/domain.operations/cloudwatchLogGroup/getOneCloudwatchLogGroup';
import { setCloudwatchLogGroup } from '@src/domain.operations/cloudwatchLogGroup/setCloudwatchLogGroup';

/**
 * .what = declastruct DAO for AWS CloudWatch Log Group resources
 * .why = wraps Log Group operations to conform to declastruct interface
 */
export const DeclaredAwsCloudwatchLogGroupDao = genDeclastructDao<
  typeof DeclaredAwsCloudwatchLogGroup,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsCloudwatchLogGroup,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneCloudwatchLogGroup({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getOneCloudwatchLogGroup({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setCloudwatchLogGroup({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setCloudwatchLogGroup({ upsert: input }, context);
    },
    delete: null,
  },
});
