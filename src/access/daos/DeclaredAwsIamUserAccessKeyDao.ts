import { genDeclastructDao } from 'declastruct';
import { BadRequestError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsIamUserAccessKey } from '../../domain.objects/DeclaredAwsIamUserAccessKey';
import { delIamUserAccessKey } from '../../domain.operations/iamUserAccessKey/delIamUserAccessKey';
import { getOneIamUserAccessKey } from '../../domain.operations/iamUserAccessKey/getOneIamUserAccessKey';
import { setIamUserAccessKey } from '../../domain.operations/iamUserAccessKey/setIamUserAccessKey';

/**
 * .what = declastruct DAO for AWS IAM user access keys
 * .why = enables declarative management (audit and purge) of access keys
 *
 * .note = finsert/upsert fail fast — access keys are superseded by SSO/OIDC
 */
export const DeclaredAwsIamUserAccessKeyDao = genDeclastructDao<
  typeof DeclaredAwsIamUserAccessKey,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsIamUserAccessKey,
  get: {
    one: {
      byUnique: async (input) => {
        // access keys have no unique key — only primary (accessKeyId)
        BadRequestError.throw(
          'byUnique not supported for access keys. use byPrimary with accessKeyId.',
          { input },
        );
      },
      byPrimary: async (input, context) => {
        return getOneIamUserAccessKey({ by: { primary: input } }, context);
      },
    },
  },
  set: {
    finsert: async (input, context) => {
      return setIamUserAccessKey({ finsert: input }, context); // fails fast
    },
    upsert: null,
    delete: async (input, context) => {
      await delIamUserAccessKey({ by: { ref: input } }, context);
    },
  },
});
