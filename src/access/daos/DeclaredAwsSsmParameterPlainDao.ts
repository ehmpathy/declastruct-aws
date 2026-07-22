import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsSsmParameterPlain } from '@src/domain.objects/DeclaredAwsSsmParameterPlain';
import { delSsmParameterPlain } from '@src/domain.operations/ssmParameterPlain/delSsmParameterPlain';
import { getOneSsmParameterPlain } from '@src/domain.operations/ssmParameterPlain/getOneSsmParameterPlain';
import { setSsmParameterPlain } from '@src/domain.operations/ssmParameterPlain/setSsmParameterPlain';

/**
 * .what = declastruct DAO for plaintext AWS SSM Parameter resources
 * .why = wraps plaintext parameter operations to conform to the declastruct interface
 */
export const DeclaredAwsSsmParameterPlainDao = genDeclastructDao<
  typeof DeclaredAwsSsmParameterPlain,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsSsmParameterPlain,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneSsmParameterPlain({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getOneSsmParameterPlain({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setSsmParameterPlain({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setSsmParameterPlain({ upsert: input }, context);
    },
    // delete via delSsmParameterPlain — a type-checked destroy (get-first asserts the live
    // param IS a String, then delParameter by the resolved name). symmetric with the Secure
    // peer's delete, so both variants are drivable the same way through declastruct apply.
    delete: async (input, context) => {
      await delSsmParameterPlain({ by: { ref: input } }, context);
    },
  },
});
