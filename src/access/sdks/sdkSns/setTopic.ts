import { CreateTopicCommand, SNSClient } from '@aws-sdk/client-sns';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = creates an SNS topic (or returns the extant one) by name
 * .why = raw i/o communicator for SNS; CreateTopic is idempotent — the same name always
 *   returns the same topic arn, so a re-run converges without a duplicate
 */
export const setTopic = async (
  input: { name: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<{ arn: string }> => {
  // create sns client
  const sns = new SNSClient(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // create-or-find the topic (idempotent on name)
  const response = await sns.send(new CreateTopicCommand({ Name: input.name }));
  const arn =
    response.TopicArn ??
    UnexpectedCodePathError.throw('CreateTopic returned no TopicArn', {
      name: input.name,
    });
  return { arn };
};
