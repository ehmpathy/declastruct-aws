import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { reconcileSesv2ResourceTags } from '@src/domain.operations/tags/reconcileSesv2ResourceTags';

import { asSesConfigurationSetArn } from './asSesConfigurationSetArn';

/**
 * .what = reconciles an SES configuration set's tags to the desired set
 * .why = resolves the configuration-set arn, then delegates to the shared sesv2 tag reconcile
 */
export const reconcileSesConfigurationSetTags = async (
  input: {
    name: string;
    before: Record<string, string> | null;
    desired: Record<string, string> | null;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // derive the arn the tag ops key on
  const arn = asSesConfigurationSetArn({
    name: input.name,
    account: context.aws.credentials.account,
    region: context.aws.credentials.region,
  });

  await reconcileSesv2ResourceTags(
    { arn, before: input.before, desired: input.desired },
    context,
  );
};
