import { asProcedure } from 'as-procedure';
import type {
  HasReadonly,
  Ref,
  RefByPrimary,
  RefByUnique,
} from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import { getEmailIdentity } from '@src/access/sdks/sdkSesv2/getEmailIdentity';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSesEmailIdentity } from '@src/domain.objects/DeclaredAwsSesEmailIdentity';

import { castIntoDeclaredAwsSesEmailIdentity } from './castIntoDeclaredAwsSesEmailIdentity';

/**
 * .what = gets a single SES email identity from aws by primary/unique (identity) or ref
 * .why = enables declarative drift detection; returns null when absent so the plan reads
 *   CREATE rather than throw (rule.forbid.plan-fail-on-apply-guided-prereq)
 */
export const getOneSesEmailIdentity = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsSesEmailIdentity>;
        unique: RefByUnique<typeof DeclaredAwsSesEmailIdentity>;
        ref: Ref<typeof DeclaredAwsSesEmailIdentity>;
      }>;
    },
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<HasReadonly<typeof DeclaredAwsSesEmailIdentity> | null> => {
    // the identity value is the whole key across primary, unique, and ref
    const identity =
      input.by.primary?.identity ??
      input.by.unique?.identity ??
      input.by.ref?.identity;
    if (!identity)
      UnexpectedCodePathError.throw(
        'getOneSesEmailIdentity got a ref with no identity',
        { input },
      );

    // read the identity attributes (null if absent)
    const found = await getEmailIdentity({ identity }, context);
    if (!found) return null;

    // cast to domain format
    return castIntoDeclaredAwsSesEmailIdentity({ identity, ...found });
  },
);
