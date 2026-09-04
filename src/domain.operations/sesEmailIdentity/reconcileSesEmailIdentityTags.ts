import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { reconcileSesv2ResourceTags } from '@src/domain.operations/tags/reconcileSesv2ResourceTags';

import { asSesEmailIdentityArn } from './asSesEmailIdentityArn';

/**
 * .what = reconciles an SES identity's tags to the desired set (drop absent, add desired)
 * .why = resolves the identity arn, then delegates to the shared sesv2 tag reconcile
 */
export const reconcileSesEmailIdentityTags = async (
  input: {
    identity: string;
    before: Record<string, string> | null;
    desired: Record<string, string> | null;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // derive the identity arn the tag ops key on
  const arn = asSesEmailIdentityArn({
    identity: input.identity,
    account: context.aws.credentials.account,
    region: context.aws.credentials.region,
  });

  await reconcileSesv2ResourceTags(
    { arn, before: input.before, desired: input.desired },
    context,
  );
};
