import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsSesEmailIdentity } from '@src/domain.objects/DeclaredAwsSesEmailIdentity';
import { delSesEmailIdentity } from '@src/domain.operations/sesEmailIdentity/delSesEmailIdentity';
import { getOneSesEmailIdentity } from '@src/domain.operations/sesEmailIdentity/getOneSesEmailIdentity';
import { setSesEmailIdentity } from '@src/domain.operations/sesEmailIdentity/setSesEmailIdentity';

/**
 * .what = declastruct DAO for AWS SES Email Identity resources
 * .why = wraps the identity operations to conform to the declastruct interface, so an
 *   identity (a domain or an email) is drivable through plan/apply like its peers
 */
export const DeclaredAwsSesEmailIdentityDao = genDeclastructDao<
  typeof DeclaredAwsSesEmailIdentity,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsSesEmailIdentity,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneSesEmailIdentity({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getOneSesEmailIdentity({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setSesEmailIdentity({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setSesEmailIdentity({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delSesEmailIdentity({ by: { ref: input } }, context);
    },
  },
});
