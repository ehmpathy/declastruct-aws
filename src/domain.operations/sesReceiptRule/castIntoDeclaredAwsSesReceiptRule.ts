import { RefByUnique } from 'domain-objects';

import type {
  ReceiptActionResolved,
  ReceiptRuleResolved,
} from '@src/access/sdks/sdkSes/ReceiptRuleResolved';
import type { DeclaredAwsS3Bucket } from '@src/domain.objects/DeclaredAwsS3Bucket';
import { DeclaredAwsSesReceiptAction } from '@src/domain.objects/DeclaredAwsSesReceiptAction';
import { DeclaredAwsSesReceiptActionAddHeader } from '@src/domain.objects/DeclaredAwsSesReceiptActionAddHeader';
import { DeclaredAwsSesReceiptActionBounce } from '@src/domain.objects/DeclaredAwsSesReceiptActionBounce';
import { DeclaredAwsSesReceiptActionConnect } from '@src/domain.objects/DeclaredAwsSesReceiptActionConnect';
import { DeclaredAwsSesReceiptActionLambda } from '@src/domain.objects/DeclaredAwsSesReceiptActionLambda';
import { DeclaredAwsSesReceiptActionS3 } from '@src/domain.objects/DeclaredAwsSesReceiptActionS3';
import { DeclaredAwsSesReceiptActionSns } from '@src/domain.objects/DeclaredAwsSesReceiptActionSns';
import { DeclaredAwsSesReceiptActionStop } from '@src/domain.objects/DeclaredAwsSesReceiptActionStop';
import { DeclaredAwsSesReceiptActionWorkmail } from '@src/domain.objects/DeclaredAwsSesReceiptActionWorkmail';
import { DeclaredAwsSesReceiptRule } from '@src/domain.objects/DeclaredAwsSesReceiptRule';
import type { DeclaredAwsSesReceiptRuleSet } from '@src/domain.objects/DeclaredAwsSesReceiptRuleSet';
import type { DeclaredAwsSnsTopic } from '@src/domain.objects/DeclaredAwsSnsTopic';
import { asSnsTopicName } from '@src/domain.operations/snsTopic/asSnsTopicName';

/**
 * .what = builds a topic ref from a raw topic arn (null passes through)
 * .why = every action's optional notify topic reverses the same way
 */
const asTopicRef = (
  topicArn: string | null,
): RefByUnique<typeof DeclaredAwsSnsTopic> | null =>
  topicArn
    ? RefByUnique.as<typeof DeclaredAwsSnsTopic>({
        name: asSnsTopicName({ arn: topicArn }),
      })
    : null;

/**
 * .what = builds one domain action from a resolved action (exactly one kind non-null)
 * .why = reverses arns to refs so a re-plan compares domain objects
 */
const asReceiptActionDomain = (
  action: ReceiptActionResolved,
): DeclaredAwsSesReceiptAction =>
  new DeclaredAwsSesReceiptAction({
    s3: action.s3
      ? new DeclaredAwsSesReceiptActionS3({
          bucket: RefByUnique.as<typeof DeclaredAwsS3Bucket>({
            name: action.s3.bucketName,
          }),
          objectKeyPrefix: action.s3.objectKeyPrefix,
          topic: asTopicRef(action.s3.topicArn),
          kmsKeyArn: action.s3.kmsKeyArn,
        })
      : null,
    sns: action.sns
      ? new DeclaredAwsSesReceiptActionSns({
          topic: RefByUnique.as<typeof DeclaredAwsSnsTopic>({
            name: asSnsTopicName({ arn: action.sns.topicArn }),
          }),
          encodeAs: action.sns.encodeAs,
        })
      : null,
    lambda: action.lambda
      ? new DeclaredAwsSesReceiptActionLambda({
          functionArn: action.lambda.functionArn,
          topic: asTopicRef(action.lambda.topicArn),
          invocationType: action.lambda.invocationType,
        })
      : null,
    bounce: action.bounce
      ? new DeclaredAwsSesReceiptActionBounce({
          smtpReplyCode: action.bounce.smtpReplyCode,
          statusCode: action.bounce.statusCode,
          message: action.bounce.message,
          sender: action.bounce.sender,
          topic: asTopicRef(action.bounce.topicArn),
        })
      : null,
    stop: action.stop
      ? new DeclaredAwsSesReceiptActionStop({
          scope: action.stop.scope,
          topic: asTopicRef(action.stop.topicArn),
        })
      : null,
    addHeader: action.addHeader
      ? new DeclaredAwsSesReceiptActionAddHeader({
          headerName: action.addHeader.headerName,
          headerValue: action.addHeader.headerValue,
        })
      : null,
    workmail: action.workmail
      ? new DeclaredAwsSesReceiptActionWorkmail({
          organizationArn: action.workmail.organizationArn,
          topic: asTopicRef(action.workmail.topicArn),
        })
      : null,
    connect: action.connect
      ? new DeclaredAwsSesReceiptActionConnect({
          instanceArn: action.connect.instanceArn,
          iamRoleArn: action.connect.iamRoleArn,
        })
      : null,
  });

/**
 * .what = transforms a resolved SES receipt rule read into DeclaredAwsSesReceiptRule
 * .why = ensures type safety at the sdk boundary; reverses every action's arns to refs so a
 *   re-plan converges to KEEP
 */
export const castIntoDeclaredAwsSesReceiptRule = (input: {
  ruleSetName: string;
  resolved: ReceiptRuleResolved;
}): DeclaredAwsSesReceiptRule => {
  return DeclaredAwsSesReceiptRule.as({
    ruleSet: RefByUnique.as<typeof DeclaredAwsSesReceiptRuleSet>({
      name: input.ruleSetName,
    }),
    name: input.resolved.name,
    enabled: input.resolved.enabled,
    recipients: input.resolved.recipients,
    actions: input.resolved.actions.map(asReceiptActionDomain),
    tlsPolicy: input.resolved.tlsPolicy,
    scanEnabled: input.resolved.scanEnabled,
  });
};
