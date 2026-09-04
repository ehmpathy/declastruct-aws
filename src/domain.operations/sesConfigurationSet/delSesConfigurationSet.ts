import { asProcedure } from 'as-procedure';
import type { Ref, RefByPrimary, RefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import { delConfigurationSet } from '@src/access/sdks/sdkSesv2/delConfigurationSet';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSesConfigurationSet } from '@src/domain.objects/DeclaredAwsSesConfigurationSet';

/**
 * .what = deletes an SES configuration set by primary/unique (name) or ref
 * .why = the idempotent destroy path the DAO's set.delete drives; an absent set is a no-op so
 *   a repeat delete converges
 */
export const delSesConfigurationSet = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsSesConfigurationSet>;
        unique: RefByUnique<typeof DeclaredAwsSesConfigurationSet>;
        ref: Ref<typeof DeclaredAwsSesConfigurationSet>;
      }>;
    },
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<void> => {
    // the name is the whole key across primary, unique, and ref
    const name =
      input.by.primary?.name ?? input.by.unique?.name ?? input.by.ref?.name;
    if (!name)
      UnexpectedCodePathError.throw(
        'delSesConfigurationSet got a ref with no name',
        { input },
      );

    // delete the set (idempotent)
    await delConfigurationSet({ name }, context);
  },
);
