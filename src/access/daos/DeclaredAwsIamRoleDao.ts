import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsIamRole } from '@src/domain.objects/DeclaredAwsIamRole';
import { getIamRole } from '@src/domain.operations/iamRole/getIamRole';
import { setIamRole } from '@src/domain.operations/iamRole/setIamRole';

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
    findsert: async (input, context) => {
      return setIamRole({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setIamRole({ upsert: input }, context);
    },
    delete: null,
  },
});
