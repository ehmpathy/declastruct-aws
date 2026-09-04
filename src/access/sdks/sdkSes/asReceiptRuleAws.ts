import type {
  InvocationType,
  ReceiptAction,
  ReceiptRule,
  SNSActionEncoding,
  StopScope,
  TlsPolicy,
} from '@aws-sdk/client-ses';

import type {
  ReceiptActionResolved,
  ReceiptRuleResolved,
} from './ReceiptRuleResolved';

/**
 * .what = builds one aws ReceiptAction from a resolved action (exactly one kind non-null)
 * .why = keeps the aws sdk shape at the boundary; create + update share this builder
 * .note = the `as` casts below are the SANCTIONED external-sdk-boundary casts
 *   (rule.forbid.as-cast exempts casts at a third-party sdk boundary). our domain carries
 *   friendly nullable `string` shapes; the AWS sdk types the SAME values as its own
 *   string-literal unions (`SNSActionEncoding`, `InvocationType`, `StopScope`). the domain
 *   values are drawn from those exact literal sets, and AWS validates them at the api, so each
 *   cast narrows an equal-or-wider domain string to the sdk enum with no runtime risk (a null
 *   maps to `undefined`). removal path: if the domain objects were typed with the sdk enums
 *   directly, every cast drops — we keep the friendly shapes to avoid a hard bind to the sdk's
 *   enum types.
 */
const asReceiptActionAws = (action: ReceiptActionResolved): ReceiptAction => ({
  S3Action: action.s3
    ? {
        BucketName: action.s3.bucketName,
        ObjectKeyPrefix: action.s3.objectKeyPrefix ?? undefined,
        TopicArn: action.s3.topicArn ?? undefined,
        KmsKeyArn: action.s3.kmsKeyArn ?? undefined,
      }
    : undefined,
  SNSAction: action.sns
    ? {
        TopicArn: action.sns.topicArn,
        // sdk-boundary cast (see .note): domain nullable literal -> the sdk's SNSActionEncoding
        Encoding: (action.sns.encodeAs ?? undefined) as
          | SNSActionEncoding
          | undefined,
      }
    : undefined,
  LambdaAction: action.lambda
    ? {
        FunctionArn: action.lambda.functionArn,
        TopicArn: action.lambda.topicArn ?? undefined,
        // sdk-boundary cast (see .note): domain nullable literal -> the sdk's InvocationType
        InvocationType: (action.lambda.invocationType ?? undefined) as
          | InvocationType
          | undefined,
      }
    : undefined,
  BounceAction: action.bounce
    ? {
        SmtpReplyCode: action.bounce.smtpReplyCode,
        StatusCode: action.bounce.statusCode ?? undefined,
        Message: action.bounce.message,
        Sender: action.bounce.sender,
        TopicArn: action.bounce.topicArn ?? undefined,
      }
    : undefined,
  StopAction: action.stop
    ? {
        // sdk-boundary cast (see .note): domain closed literal ('RuleSet') -> the sdk's StopScope
        Scope: action.stop.scope as StopScope,
        TopicArn: action.stop.topicArn ?? undefined,
      }
    : undefined,
  AddHeaderAction: action.addHeader
    ? {
        HeaderName: action.addHeader.headerName,
        HeaderValue: action.addHeader.headerValue,
      }
    : undefined,
  WorkmailAction: action.workmail
    ? {
        OrganizationArn: action.workmail.organizationArn,
        TopicArn: action.workmail.topicArn ?? undefined,
      }
    : undefined,
  ConnectAction: action.connect
    ? {
        InstanceARN: action.connect.instanceArn,
        IAMRoleARN: action.connect.iamRoleArn,
      }
    : undefined,
});

/**
 * .what = builds the aws ReceiptRule from a resolved receipt rule
 * .why = the shared shape create + update both send
 */
export const asReceiptRuleAws = (rule: ReceiptRuleResolved): ReceiptRule => ({
  Name: rule.name,
  Enabled: rule.enabled,
  // sdk-boundary cast (rule.forbid.as-cast exempts a third-party sdk boundary): our domain
  // carries a nullable closed literal ('Require' | 'Optional') that is a member of aws's
  // TlsPolicy enum; null maps to undefined, and aws validates at the api, so no runtime risk.
  // removal path: if the domain typed `tlsPolicy` as the sdk's TlsPolicy directly, the cast
  // drops — we keep the friendly nullable literal to avoid a hard bind to the sdk enum.
  TlsPolicy: (rule.tlsPolicy ?? undefined) as TlsPolicy | undefined,
  Recipients: rule.recipients,
  ScanEnabled: rule.scanEnabled,
  Actions: rule.actions.map(asReceiptActionAws),
});
