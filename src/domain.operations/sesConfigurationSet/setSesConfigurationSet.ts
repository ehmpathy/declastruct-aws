import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import { createConfigurationSet } from '@src/access/sdks/sdkSesv2/createConfigurationSet';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSesConfigurationSet } from '@src/domain.objects/DeclaredAwsSesConfigurationSet';

import { getOneSesConfigurationSet } from './getOneSesConfigurationSet';
import { reconcileSesConfigurationSetTags } from './reconcileSesConfigurationSetTags';

/**
 * .what = creates or updates an SES configuration set (findsert | upsert)
 * .why = enables declarative management of the group that captures sent-mail events
 *
 * .idempotency
 *   - findsert on the FULL unique key (name = the whole natural key): look up by name,
 *     return the extant if present, else CreateConfigurationSet (a no-op on an already-owned
 *     set). a re-run converges to KEEP.
 *   - tags reconcile independently on every upsert.
 */
export const setSesConfigurationSet = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsSesConfigurationSet;
      upsert: DeclaredAwsSesConfigurationSet;
    }>,
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<HasReadonly<typeof DeclaredAwsSesConfigurationSet>> => {
    const desired = input.findsert ?? input.upsert;

    // find the extant set by unique name
    const foundBefore = await getOneSesConfigurationSet(
      { by: { unique: { name: desired.name } } },
      context,
    );

    // findsert: return the extant unchanged
    if (foundBefore && input.findsert) return foundBefore;

    // create the set (a no-op if already ours); tags are set at create
    await createConfigurationSet(
      { name: desired.name, tags: desired.tags ? { ...desired.tags } : {} },
      context,
    );

    // reconcile tags ONLY for a set that pre-existed. createConfigurationSet sets the tags
    // inline on a fresh create (its Tags param is authoritative), so a create-path reconcile
    // would redundantly re-issue TagResource for tags already applied — a needless code path
    // and a needless call (rule.require.fewer-paths-via-idempotency). only when the set
    // pre-existed does createConfigurationSet no-op (AlreadyExists) and leave tags unchanged, so
    // the reconcile is then what converges any tag drift on an upsert.
    if (foundBefore)
      await reconcileSesConfigurationSetTags(
        {
          name: desired.name,
          before: foundBefore.tags ? { ...foundBefore.tags } : null,
          desired: desired.tags ? { ...desired.tags } : null,
        },
        context,
      );

    // read back the written set
    const foundAfter = await getOneSesConfigurationSet(
      { by: { unique: { name: desired.name } } },
      context,
    );

    // failfast if absent after set
    if (!foundAfter)
      UnexpectedCodePathError.throw(
        'ses configuration set not found after set',
        { desired },
      );

    return foundAfter;
  },
);
