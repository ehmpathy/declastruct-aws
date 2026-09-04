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

import { getConfigurationSet } from '@src/access/sdks/sdkSesv2/getConfigurationSet';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSesConfigurationSet } from '@src/domain.objects/DeclaredAwsSesConfigurationSet';

import { castIntoDeclaredAwsSesConfigurationSet } from './castIntoDeclaredAwsSesConfigurationSet';

/**
 * .what = gets a single SES configuration set from aws by primary/unique (name) or ref
 * .why = enables declarative drift detection; returns null when absent so the plan reads
 *   CREATE rather than throw (rule.forbid.plan-fail-on-apply-guided-prereq)
 */
export const getOneSesConfigurationSet = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsSesConfigurationSet>;
        unique: RefByUnique<typeof DeclaredAwsSesConfigurationSet>;
        ref: Ref<typeof DeclaredAwsSesConfigurationSet>;
      }>;
    },
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<HasReadonly<typeof DeclaredAwsSesConfigurationSet> | null> => {
    // the name is the whole key across primary, unique, and ref
    const name =
      input.by.primary?.name ?? input.by.unique?.name ?? input.by.ref?.name;
    if (!name)
      UnexpectedCodePathError.throw(
        'getOneSesConfigurationSet got a ref with no name',
        { input },
      );

    // read the configuration set (null if absent)
    const found = await getConfigurationSet({ name }, context);
    if (!found) return null;

    // cast to domain format
    return castIntoDeclaredAwsSesConfigurationSet({ name, tags: found.tags });
  },
);
