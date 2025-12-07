import { DeclastructDao } from 'declastruct';
import { isRefByPrimary, isRefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsIamOidcProvider } from '../../domain.objects/DeclaredAwsIamOidcProvider';
import { getOneIamOidcProvider } from '../../domain.operations/iamOidcProvider/getOneIamOidcProvider';
import { setIamOidcProvider } from '../../domain.operations/iamOidcProvider/setIamOidcProvider';

/**
 * .what = declastruct DAO for AWS IAM OIDC provider resources
 * .why = wraps OIDC provider operations to conform to declastruct interface
 */
export const DeclaredAwsIamOidcProviderDao = new DeclastructDao<
  DeclaredAwsIamOidcProvider,
  typeof DeclaredAwsIamOidcProvider,
  ContextAwsApi & ContextLogTrail
>({
  get: {
    byPrimary: async (input, context) => {
      return getOneIamOidcProvider({ by: { primary: input } }, context);
    },
    byUnique: async (input, context) => {
      return getOneIamOidcProvider({ by: { unique: input } }, context);
    },
    byRef: async (input, context) => {
      // route to unique if ref is by unique
      if (isRefByUnique({ of: DeclaredAwsIamOidcProvider })(input))
        return getOneIamOidcProvider({ by: { unique: input } }, context);

      // route to primary if ref is by primary
      if (isRefByPrimary({ of: DeclaredAwsIamOidcProvider })(input))
        return getOneIamOidcProvider({ by: { primary: input } }, context);

      // failfast if ref is neither unique nor primary
      UnexpectedCodePathError.throw('unsupported ref type', { input });
    },
  },
  set: {
    finsert: async (input, context) => {
      return setIamOidcProvider({ finsert: input }, context);
    },
    upsert: async (input, context) => {
      return setIamOidcProvider({ upsert: input }, context);
    },
  },
});
