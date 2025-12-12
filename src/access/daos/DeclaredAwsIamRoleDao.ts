import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsIamRole } from '../../domain.objects/DeclaredAwsIamRole';
import { getIamRole } from '../../domain.operations/iamRole/getIamRole';
import { setIamRole } from '../../domain.operations/iamRole/setIamRole';

/**
 * .what = declastruct DAO for AWS IAM role resources
 * .why = wraps IAM role operations to conform to declastruct interface
 */
export const DeclaredAwsIamRoleDao = genDeclastructDao<
  typeof DeclaredAwsIamRole,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsIamRole,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getIamRole({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getIamRole({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    finsert: async (input, context) => {
      return setIamRole({ finsert: input }, context);
    },
    upsert: async (input, context) => {
      return setIamRole({ upsert: input }, context);
    },
    delete: null,
  },
});
