import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsSsmParameterSecure } from '@src/domain.objects/DeclaredAwsSsmParameterSecure';
import { delSsmParameterSecure } from '@src/domain.operations/ssmParameterSecure/delSsmParameterSecure';
import { getOneSsmParameterSecure } from '@src/domain.operations/ssmParameterSecure/getOneSsmParameterSecure';
import { setSsmParameterSecure } from '@src/domain.operations/ssmParameterSecure/setSsmParameterSecure';

/**
 * .what = declastruct DAO for secret AWS SSM Parameter resources (SecureString)
 * .why = wraps write-only secret operations to conform to the declastruct interface;
 *   plan reconciles via metadata only (no GetParameter, no kms:Decrypt)
 */
export const DeclaredAwsSsmParameterSecureDao = genDeclastructDao<
  typeof DeclaredAwsSsmParameterSecure,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsSsmParameterSecure,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneSsmParameterSecure({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getOneSsmParameterSecure({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setSsmParameterSecure({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setSsmParameterSecure({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delSsmParameterSecure({ by: { ref: input } }, context);
    },
  },
});
