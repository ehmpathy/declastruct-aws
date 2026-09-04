import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsSnsTopic } from '@src/domain.objects/DeclaredAwsSnsTopic';
import { delSnsTopic } from '@src/domain.operations/snsTopic/delSnsTopic';
import { getOneSnsTopic } from '@src/domain.operations/snsTopic/getOneSnsTopic';
import { setSnsTopic } from '@src/domain.operations/snsTopic/setSnsTopic';

/**
 * .what = declastruct DAO for AWS SNS Topic resources
 * .why = wraps the topic operations to conform to the declastruct interface, so a topic is
 *   drivable through plan/apply like its peers
 */
export const DeclaredAwsSnsTopicDao = genDeclastructDao<
  typeof DeclaredAwsSnsTopic,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsSnsTopic,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneSnsTopic({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getOneSnsTopic({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setSnsTopic({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setSnsTopic({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delSnsTopic({ by: { ref: input } }, context);
    },
  },
});
