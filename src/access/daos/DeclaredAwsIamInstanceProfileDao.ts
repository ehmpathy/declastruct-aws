import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsIamInstanceProfile } from '@src/domain.objects/DeclaredAwsIamInstanceProfile';
import { getIamInstanceProfile } from '@src/domain.operations/iamInstanceProfile/getIamInstanceProfile';
import { setIamInstanceProfile } from '@src/domain.operations/iamInstanceProfile/setIamInstanceProfile';

/**
 * .what = declastruct DAO for AWS IAM instance profile resources
 * .why = wraps IAM instance profile operations to conform to declastruct interface
 */
export const DeclaredAwsIamInstanceProfileDao = genDeclastructDao<
  typeof DeclaredAwsIamInstanceProfile,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsIamInstanceProfile,
  get: {
    one: {
      byPrimary: null,
      byUnique: async (input, context) => {
        return getIamInstanceProfile({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setIamInstanceProfile({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setIamInstanceProfile({ upsert: input }, context);
    },
    delete: null,
  },
});
