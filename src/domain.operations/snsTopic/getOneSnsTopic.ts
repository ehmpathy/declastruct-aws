import { asProcedure } from 'as-procedure';
import type {
  HasReadonly,
  Ref,
  RefByPrimary,
  RefByUnique,
} from 'domain-objects';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import { getTopicAttributes } from '@src/access/sdks/sdkSns/getTopicAttributes';
import { listTopicTags } from '@src/access/sdks/sdkSns/listTopicTags';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSnsTopic } from '@src/domain.objects/DeclaredAwsSnsTopic';

import { asSnsTopicRef } from './asSnsTopicRef';
import { castIntoDeclaredAwsSnsTopic } from './castIntoDeclaredAwsSnsTopic';

/**
 * .what = gets a single SNS topic from aws by primary (arn), unique (name), or ref
 * .why = enables declarative drift detection; returns null when absent so the plan reads
 *   CREATE rather than throw (rule.forbid.plan-fail-on-apply-guided-prereq)
 */
export const getOneSnsTopic = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsSnsTopic>;
        unique: RefByUnique<typeof DeclaredAwsSnsTopic>;
        ref: Ref<typeof DeclaredAwsSnsTopic>;
      }>;
    },
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<HasReadonly<typeof DeclaredAwsSnsTopic> | null> => {
    // derive the arn + name from the input
    const { arn, name } = asSnsTopicRef(
      { by: input.by },
      {
        account: context.aws.credentials.account,
        region: context.aws.credentials.region,
      },
    );

    // read the topic (null if absent)
    const found = await getTopicAttributes({ arn }, context);
    if (!found) return null;

    // read the tags
    const tags = await listTopicTags({ arn: found.arn }, context);

    // cast to domain format
    return castIntoDeclaredAwsSnsTopic({ arn: found.arn, name, tags });
  },
);
