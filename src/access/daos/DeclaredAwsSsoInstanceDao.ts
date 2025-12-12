import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsSsoInstance } from '../../domain.objects/DeclaredAwsSsoInstance';
import { getOneSsoInstance } from '../../domain.operations/ssoInstance/getOneSsoInstance';
import { setSsoInstance } from '../../domain.operations/ssoInstance/setSsoInstance';

/**
 * .what = declastruct DAO for AWS SSO Identity Center instance resources
 * .why = wraps SSO instance operations to conform to declastruct interface
 *
 * .note
 *   - sso instances cannot be created via api; must be enabled in aws console
 *   - set.finsert will failfast if instance doesn't exist
 */
export const DeclaredAwsSsoInstanceDao = genDeclastructDao<
  typeof DeclaredAwsSsoInstance,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsSsoInstance,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneSsoInstance({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getOneSsoInstance({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    finsert: async (input, context) => {
      return setSsoInstance({ finsert: input }, context);
    },
    upsert: null,
    delete: null,
  },
});
