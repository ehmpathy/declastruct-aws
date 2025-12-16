import { genDeclastructDao } from 'declastruct';
import { BadRequestError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsIamUser } from '@src/domain.objects/DeclaredAwsIamUser';
import { getOneIamUser } from '@src/domain.operations/iamUser/getOneIamUser';

/**
 * .what = declastruct DAO for AWS IAM user resources
 * .why = wraps IAM user operations to conform to declastruct interface
 *
 * .note = set operations not supported - users are managed externally
 */
export const DeclaredAwsIamUserDao = genDeclastructDao<
  typeof DeclaredAwsIamUser,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsIamUser,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneIamUser({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getOneIamUser({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input) => {
      // IAM users are managed externally; set operations not supported
      BadRequestError.throw(
        'IAM user creation not supported by this DAO. IAM users are managed externally.',
        { input },
      );
    },
    upsert: null,
    delete: null,
  },
});
