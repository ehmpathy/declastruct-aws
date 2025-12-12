import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsSsoPermissionSet } from '../../domain.objects/DeclaredAwsSsoPermissionSet';
import { getOneSsoPermissionSet } from '../../domain.operations/ssoPermissionSet/getOneSsoPermissionSet';
import { setSsoPermissionSet } from '../../domain.operations/ssoPermissionSet/setSsoPermissionSet';

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
    finsert: async (input, context) => {
      return setSsoPermissionSet({ finsert: input }, context);
    },
    upsert: async (input, context) => {
      return setSsoPermissionSet({ upsert: input }, context);
    },
    delete: null,
  },
});
