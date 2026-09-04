import type { RefByUnique } from 'domain-objects';

import type {
  ReceiptActionResolved,
  ReceiptRuleResolved,
} from '@src/access/sdks/sdkSes/ReceiptRuleResolved';
import type { DeclaredAwsSesReceiptAction } from '@src/domain.objects/DeclaredAwsSesReceiptAction';
import type { DeclaredAwsSesReceiptRule } from '@src/domain.objects/DeclaredAwsSesReceiptRule';
import type { DeclaredAwsSnsTopic } from '@src/domain.objects/DeclaredAwsSnsTopic';
import { asSnsTopicArn } from '@src/domain.operations/snsTopic/asSnsTopicArn';
import { assertExactlyOnePresent } from '@src/infra/validation/assertExactlyOnePresent';

/**
 * .what = derives a raw topic arn from a topic ref (null passes through)
 * .why = every action's optional notify topic derives the same way
 */
const asTopicArn = (
  topic: RefByUnique<typeof DeclaredAwsSnsTopic> | null,
  context: { account: string; region: string },
): string | null =>
  topic
    ? asSnsTopicArn({
        name: topic.name,
        account: context.account,
        region: context.region,
      })
    : null;

/**
 * .what = derives one resolved action from a domain action (refs → arns / names)
 * .why = the sdk speaks raw aws strings; the ref → arn derivation happens here
 */
const asReceiptActionResolvedFromDomain = (
  action: DeclaredAwsSesReceiptAction,
  context: { account: string; region: string },
): ReceiptActionResolved => {
  // enforce the "exactly one action kind" invariant the domain object documents, so a
  // malformed action (0 or 2+ kinds) fails loud here instead of a raw SDK error at apply
  assertExactlyOnePresent({
    of: action,
    keys: [
      's3',
      'sns',
      'lambda',
      'bounce',
      'stop',
      'addHeader',
      'workmail',
      'connect',
    ],
    label: 'a receipt rule action',
  });

  return {
    s3: action.s3
      ? {
          bucketName: action.s3.bucket.name,
          objectKeyPrefix: action.s3.objectKeyPrefix,
          topicArn: asTopicArn(action.s3.topic, context),
          kmsKeyArn: action.s3.kmsKeyArn,
        }
      : null,
    sns: action.sns
      ? {
          topicArn: asSnsTopicArn({
            name: action.sns.topic.name,
            account: context.account,
            region: context.region,
          }),
          encodeAs: action.sns.encodeAs,
        }
      : null,
    lambda: action.lambda
      ? {
          functionArn: action.lambda.functionArn,
          topicArn: asTopicArn(action.lambda.topic, context),
          invocationType: action.lambda.invocationType,
        }
      : null,
    bounce: action.bounce
      ? {
          smtpReplyCode: action.bounce.smtpReplyCode,
          statusCode: action.bounce.statusCode,
          message: action.bounce.message,
          sender: action.bounce.sender,
          topicArn: asTopicArn(action.bounce.topic, context),
        }
      : null,
    stop: action.stop
      ? {
          scope: action.stop.scope,
          topicArn: asTopicArn(action.stop.topic, context),
        }
      : null,
    addHeader: action.addHeader
      ? {
          headerName: action.addHeader.headerName,
          headerValue: action.addHeader.headerValue,
        }
      : null,
    workmail: action.workmail
      ? {
          organizationArn: action.workmail.organizationArn,
          topicArn: asTopicArn(action.workmail.topic, context),
        }
      : null,
    connect: action.connect
      ? {
          instanceArn: action.connect.instanceArn,
          iamRoleArn: action.connect.iamRoleArn,
        }
      : null,
  };
};

/**
 * .what = derives the resolved receipt rule (raw aws strings) from the domain object
 * .why = the sdk boundary speaks arns, not refs; this centralizes the ref → arn derivation
 */
export const asReceiptRuleResolved = (
  rule: DeclaredAwsSesReceiptRule,
  context: { account: string; region: string },
): ReceiptRuleResolved => ({
  name: rule.name,
  enabled: rule.enabled,
  recipients: rule.recipients,
  tlsPolicy: rule.tlsPolicy,
  scanEnabled: rule.scanEnabled,
  actions: rule.actions.map((action) =>
    asReceiptActionResolvedFromDomain(action, context),
  ),
});
