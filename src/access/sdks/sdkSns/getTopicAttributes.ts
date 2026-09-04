import { GetTopicAttributesCommand, SNSClient } from '@aws-sdk/client-sns';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = reads a single SNS topic's attributes by arn
 * .why = raw i/o communicator for SNS; returns null when the topic is absent so the
 *   plan-time get degrades to CREATE rather than throw
 */
export const getTopicAttributes = async (
  input: { arn: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<{ arn: string } | null> => {
  // create sns client
  const sns = new SNSClient(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // read the topic attributes; an absent topic surfaces as NotFoundException
  // .note = match on error.name, not `instanceof NotFoundException`: aws-sdk v3 can bundle a
  //   duplicate sdk copy that breaks the prototype chain (same boundary idiom as delParameter)
  try {
    const response = await sns.send(
      new GetTopicAttributesCommand({ TopicArn: input.arn }),
    );
    const arn = response.Attributes?.TopicArn;
    if (!arn) return null;
    return { arn };
  } catch (error) {
    if (error instanceof Error && error.name === 'NotFoundException')
      return null;
    throw error;
  }
};
