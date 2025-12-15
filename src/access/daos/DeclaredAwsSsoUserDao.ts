import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsSsoUser } from '../../domain.objects/DeclaredAwsSsoUser';
import { getOneSsoUser } from '../../domain.operations/ssoUser/getOneSsoUser';
import { setSsoUser } from '../../domain.operations/ssoUser/setSsoUser';

/**
 * .what = declastruct DAO for AWS SSO user resources
 * .why = wraps SSO user operations to conform to declastruct interface
 */
export const DeclaredAwsSsoUserDao = genDeclastructDao<
  typeof DeclaredAwsSsoUser,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsSsoUser,
  get: {
    one: {
      byPrimary: null,
      byUnique: async (input, context) => {
        return getOneSsoUser({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setSsoUser({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setSsoUser({ upsert: input }, context);
    },
    delete: null,
  },
});
