import { DeleteTopicCommand, SNSClient } from '@aws-sdk/client-sns';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = deletes an SNS topic by arn
 * .why = raw i/o communicator for SNS; idempotent — an absent topic is a no-op, so a
 *   repeat delete converges without error
 */
export const delTopic = async (
  input: { arn: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create sns client
  const sns = new SNSClient(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // delete the topic; an absent topic is already in the desired state
  // .note = match on error.name, not `instanceof NotFoundException`: aws-sdk v3 can bundle a
  //   duplicate sdk copy that breaks the prototype chain (same boundary idiom as delParameter)
  try {
    await sns.send(new DeleteTopicCommand({ TopicArn: input.arn }));
  } catch (error) {
    if (error instanceof Error && error.name === 'NotFoundException') return;
    throw error;
  }
};
