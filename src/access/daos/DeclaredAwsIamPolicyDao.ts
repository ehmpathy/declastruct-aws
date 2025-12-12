import { genDeclastructDao } from 'declastruct';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsIamPolicy } from '../../domain.objects/DeclaredAwsIamPolicy';
import { getOneIamPolicy } from '../../domain.operations/iamPolicy/getOneIamPolicy';

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
    finsert: async () => {
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
