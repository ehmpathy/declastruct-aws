import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsSesConfigurationSet } from '@src/domain.objects/DeclaredAwsSesConfigurationSet';
import { delSesConfigurationSet } from '@src/domain.operations/sesConfigurationSet/delSesConfigurationSet';
import { getOneSesConfigurationSet } from '@src/domain.operations/sesConfigurationSet/getOneSesConfigurationSet';
import { setSesConfigurationSet } from '@src/domain.operations/sesConfigurationSet/setSesConfigurationSet';

/**
 * .what = declastruct DAO for AWS SES Configuration Set resources
 * .why = wraps the configuration-set operations to conform to the declastruct interface, so a
 *   set is drivable through plan/apply like its peers
 */
export const DeclaredAwsSesConfigurationSetDao = genDeclastructDao<
  typeof DeclaredAwsSesConfigurationSet,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsSesConfigurationSet,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneSesConfigurationSet({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getOneSesConfigurationSet({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setSesConfigurationSet({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setSesConfigurationSet({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delSesConfigurationSet({ by: { ref: input } }, context);
    },
  },
});
