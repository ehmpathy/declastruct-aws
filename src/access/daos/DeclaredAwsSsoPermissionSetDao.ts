import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsSsoPermissionSet } from '@src/domain.objects/DeclaredAwsSsoPermissionSet';
import { getOneSsoPermissionSet } from '@src/domain.operations/ssoPermissionSet/getOneSsoPermissionSet';
import { setSsoPermissionSet } from '@src/domain.operations/ssoPermissionSet/setSsoPermissionSet';

/**
 * .what = declastruct DAO for AWS SSO permission set resources
 * .why = wraps permission set operations to conform to declastruct interface
 */
export const DeclaredAwsSsoPermissionSetDao = genDeclastructDao<
  typeof DeclaredAwsSsoPermissionSet,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsSsoPermissionSet,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneSsoPermissionSet({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getOneSsoPermissionSet({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setSsoPermissionSet({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setSsoPermissionSet({ upsert: input }, context);
    },
    delete: null,
  },
});
