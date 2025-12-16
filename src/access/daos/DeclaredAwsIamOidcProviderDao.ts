import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsIamOidcProvider } from '@src/domain.objects/DeclaredAwsIamOidcProvider';
import { getOneIamOidcProvider } from '@src/domain.operations/iamOidcProvider/getOneIamOidcProvider';
import { setIamOidcProvider } from '@src/domain.operations/iamOidcProvider/setIamOidcProvider';

/**
 * .what = declastruct DAO for AWS IAM OIDC provider resources
 * .why = wraps OIDC provider operations to conform to declastruct interface
 */
export const DeclaredAwsIamOidcProviderDao = genDeclastructDao<
  typeof DeclaredAwsIamOidcProvider,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsIamOidcProvider,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneIamOidcProvider({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getOneIamOidcProvider({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setIamOidcProvider({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setIamOidcProvider({ upsert: input }, context);
    },
    delete: null,
  },
});
