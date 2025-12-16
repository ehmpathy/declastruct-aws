import { genDeclastructDao } from 'declastruct';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsIamPolicy } from '@src/domain.objects/DeclaredAwsIamPolicy';
import { getOneIamPolicy } from '@src/domain.operations/iamPolicy/getOneIamPolicy';

/**
 * .what = declastruct DAO for AWS IAM managed policies
 * .why = wraps IAM policy operations to conform to declastruct interface
 * .note
 *   - currently read-only (no set/delete operations)
 *   - supports both aws-managed and customer-managed policies
 */
export const DeclaredAwsIamPolicyDao = genDeclastructDao<
  typeof DeclaredAwsIamPolicy,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsIamPolicy,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneIamPolicy({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getOneIamPolicy({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async () => {
      UnexpectedCodePathError.throw(
        'DeclaredAwsIamPolicy is read-only; use aws console or cli to create managed policies',
      );
    },
    upsert: async () => {
      UnexpectedCodePathError.throw(
        'DeclaredAwsIamPolicy is read-only; use aws console or cli to update managed policies',
      );
    },
    delete: null,
  },
});
