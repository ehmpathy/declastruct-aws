import {
  DescribeReceiptRuleCommand,
  type ReceiptAction,
  type ReceiptRule,
  SESClient,
} from '@aws-sdk/client-ses';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';
import type {
  ReceiptActionResolved,
  ReceiptRuleResolved,
} from './ReceiptRuleResolved';

/**
 * .what = parses one raw aws ReceiptAction into a resolved action (raw arns as strings)
 * .why = the reverse of asReceiptRuleAws; the operation layer maps arns back to refs
 * .note = the two sns/lambda enum reads below are SANCTIONED sdk-boundary casts
 *   (rule.forbid.as-cast exempts a third-party sdk boundary). the SES v1 sdk types these enum
 *   fields as loose `string | undefined`, while the resolved shape carries the documented SES
 *   literal set; the cast narrows the loose sdk string to that set (AWS only ever returns a
 *   value from it, and validates on write). removal path: if the sdk typed these as literal
 *   unions, the casts drop — they exist only because the v1 sdk under-types its own enums
 */
const asReceiptActionResolved = (
  action: ReceiptAction,
): ReceiptActionResolved => ({
  s3: action.S3Action
    ? {
        bucketName: action.S3Action.BucketName ?? '',
        objectKeyPrefix: action.S3Action.ObjectKeyPrefix ?? null,
        topicArn: action.S3Action.TopicArn ?? null,
        kmsKeyArn: action.S3Action.KmsKeyArn ?? null,
      }
    : null,
  sns: action.SNSAction
    ? {
        topicArn: action.SNSAction.TopicArn ?? '',
        encodeAs:
          (action.SNSAction.Encoding as 'UTF-8' | 'Base64' | undefined) ?? null,
      }
    : null,
  lambda: action.LambdaAction
    ? {
        functionArn: action.LambdaAction.FunctionArn ?? '',
        topicArn: action.LambdaAction.TopicArn ?? null,
        invocationType:
          (action.LambdaAction.InvocationType as
            | 'Event'
            | 'RequestResponse'
            | undefined) ?? null,
      }
    : null,
  bounce: action.BounceAction
    ? {
        smtpReplyCode: action.BounceAction.SmtpReplyCode ?? '',
        statusCode: action.BounceAction.StatusCode ?? null,
        message: action.BounceAction.Message ?? '',
        sender: action.BounceAction.Sender ?? '',
        topicArn: action.BounceAction.TopicArn ?? null,
      }
    : null,
  stop: action.StopAction
    ? {
        scope: 'RuleSet',
        topicArn: action.StopAction.TopicArn ?? null,
      }
    : null,
  addHeader: action.AddHeaderAction
    ? {
        headerName: action.AddHeaderAction.HeaderName ?? '',
        headerValue: action.AddHeaderAction.HeaderValue ?? '',
      }
    : null,
  workmail: action.WorkmailAction
    ? {
        organizationArn: action.WorkmailAction.OrganizationArn ?? '',
        topicArn: action.WorkmailAction.TopicArn ?? null,
      }
    : null,
  connect: action.ConnectAction
    ? {
        instanceArn: action.ConnectAction.InstanceARN ?? '',
        iamRoleArn: action.ConnectAction.IAMRoleARN ?? '',
      }
    : null,
});

/**
 * .what = parses a raw aws ReceiptRule into the resolved shape
 * .why = shared read shape the operation casts into the domain object
 * .note = the `tlsPolicy` read is a SANCTIONED sdk-boundary cast (same rationale as
 *   asReceiptActionResolved's .note): the v1 sdk types TlsPolicy as loose `string`, narrowed
 *   here to the documented `Require | Optional` set. removal path: drops if the sdk types it
 */
const asReceiptRuleResolved = (rule: ReceiptRule): ReceiptRuleResolved => ({
  name: rule.Name ?? '',
  enabled: rule.Enabled ?? false,
  recipients: rule.Recipients ?? [],
  tlsPolicy: (rule.TlsPolicy as 'Require' | 'Optional' | undefined) ?? null,
  scanEnabled: rule.ScanEnabled ?? false,
  actions: (rule.Actions ?? []).map(asReceiptActionResolved),
});

/**
 * .what = reads one SES receipt rule (by rule-set + rule name) as a resolved shape
 * .why = raw i/o communicator; returns null when the set or the rule is absent so the plan
 *   reads CREATE rather than throw
 */
export const getReceiptRule = async (
  input: { ruleSetName: string; ruleName: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<ReceiptRuleResolved | null> => {
  // create ses (v1) client
  const ses = new SESClient(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // read the rule (null if the set or the rule is absent)
  try {
    const response = await ses.send(
      new DescribeReceiptRuleCommand({
        RuleSetName: input.ruleSetName,
        RuleName: input.ruleName,
      }),
    );
    if (!response.Rule) return null;
    return asReceiptRuleResolved(response.Rule);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === 'RuleDoesNotExistException' ||
        error.name === 'RuleSetDoesNotExistException')
    )
      return null;
    throw error;
  }
};
