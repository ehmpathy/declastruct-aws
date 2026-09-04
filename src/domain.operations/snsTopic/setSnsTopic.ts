import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import { setTopic } from '@src/access/sdks/sdkSns/setTopic';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSnsTopic } from '@src/domain.objects/DeclaredAwsSnsTopic';

import { getOneSnsTopic } from './getOneSnsTopic';
import { reconcileSnsTopicTags } from './reconcileSnsTopicTags';

/**
 * .what = creates or updates an SNS topic (findsert | upsert)
 * .why = enables declarative management of the event-sink topic
 *
 * .idempotency
 *   - findsert on the FULL unique key (name = the whole natural identity): look up by name,
 *     return the extant if present, else CreateTopic (itself idempotent on name). a re-run
 *     converges to KEEP (rule.require.guaranteed-idempotency).
 *   - tags reconcile independently — CreateTopic does not carry tag removal.
 */
export const setSnsTopic = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsSnsTopic;
      upsert: DeclaredAwsSnsTopic;
    }>,
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<HasReadonly<typeof DeclaredAwsSnsTopic>> => {
    const desired = input.findsert ?? input.upsert;

    // find the extant topic by unique name
    const foundBefore = await getOneSnsTopic(
      { by: { unique: { name: desired.name } } },
      context,
    );

    // findsert: return the extant unchanged
    if (foundBefore && input.findsert) return foundBefore;

    // create-or-find the topic (CreateTopic is idempotent on name)
    const { arn } = await setTopic({ name: desired.name }, context);

    // reconcile tags to the desired set
    await reconcileSnsTopicTags(
      {
        arn,
        before: foundBefore?.tags ? { ...foundBefore.tags } : null,
        desired: desired.tags ? { ...desired.tags } : null,
      },
      context,
    );

    // read back the written topic
    const foundAfter = await getOneSnsTopic(
      { by: { primary: { arn } } },
      context,
    );

    // failfast if absent after set
    if (!foundAfter)
      UnexpectedCodePathError.throw('sns topic not found after set', {
        desired,
      });

    return foundAfter;
  },
);
