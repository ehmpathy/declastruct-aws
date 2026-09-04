import { asProcedure } from 'as-procedure';
import type { Ref, RefByPrimary, RefByUnique } from 'domain-objects';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import { delTopic } from '@src/access/sdks/sdkSns/delTopic';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSnsTopic } from '@src/domain.objects/DeclaredAwsSnsTopic';

import { asSnsTopicRef } from './asSnsTopicRef';

/**
 * .what = deletes an SNS topic by primary (arn), unique (name), or ref
 * .why = the idempotent destroy path the DAO's set.delete drives; an absent topic is a
 *   no-op so a repeat delete converges
 */
export const delSnsTopic = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsSnsTopic>;
        unique: RefByUnique<typeof DeclaredAwsSnsTopic>;
        ref: Ref<typeof DeclaredAwsSnsTopic>;
      }>;
    },
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<void> => {
    // derive the arn from the input
    const { arn } = asSnsTopicRef(
      { by: input.by },
      {
        account: context.aws.credentials.account,
        region: context.aws.credentials.region,
      },
    );

    // delete the topic (idempotent)
    await delTopic({ arn }, context);
  },
);
