import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsSsoUser } from '@src/domain.objects/DeclaredAwsSsoUser';
import { getOneSsoUser } from '@src/domain.operations/ssoUser/getOneSsoUser';
import { setSsoUser } from '@src/domain.operations/ssoUser/setSsoUser';

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
