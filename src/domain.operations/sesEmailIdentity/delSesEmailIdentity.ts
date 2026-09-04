import { asProcedure } from 'as-procedure';
import type { Ref, RefByPrimary, RefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import { delEmailIdentity } from '@src/access/sdks/sdkSesv2/delEmailIdentity';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSesEmailIdentity } from '@src/domain.objects/DeclaredAwsSesEmailIdentity';

/**
 * .what = deletes an SES email identity by primary/unique (identity) or ref
 * .why = the idempotent destroy path the DAO's set.delete drives; an absent identity is a
 *   no-op so a repeat delete converges
 */
export const delSesEmailIdentity = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsSesEmailIdentity>;
        unique: RefByUnique<typeof DeclaredAwsSesEmailIdentity>;
        ref: Ref<typeof DeclaredAwsSesEmailIdentity>;
      }>;
    },
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<void> => {
    // the identity value is the whole key across primary, unique, and ref
    const identity =
      input.by.primary?.identity ??
      input.by.unique?.identity ??
      input.by.ref?.identity;
    if (!identity)
      UnexpectedCodePathError.throw(
        'delSesEmailIdentity got a ref with no identity',
        { input },
      );

    // delete the identity (idempotent)
    await delEmailIdentity({ identity }, context);
  },
);
