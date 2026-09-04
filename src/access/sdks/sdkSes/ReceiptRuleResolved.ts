/**
 * .what = a receipt rule with every domain ref already derived to a raw aws value
 * .why = the sdk boundary shape shared by put + get — the operation layer converts domain
 *   refs (bucket, sns topic) to/from arns + names, so the sdk speaks only raw aws strings
 */
export interface ReceiptActionResolved {
  s3: {
    bucketName: string;
    objectKeyPrefix: string | null;
    topicArn: string | null;
    kmsKeyArn: string | null;
  } | null;
  sns: {
    topicArn: string;
    encodeAs: 'UTF-8' | 'Base64' | null;
  } | null;
  lambda: {
    functionArn: string;
    topicArn: string | null;
    invocationType: 'Event' | 'RequestResponse' | null;
  } | null;
  bounce: {
    smtpReplyCode: string;
    statusCode: string | null;
    message: string;
    sender: string;
    topicArn: string | null;
  } | null;
  stop: {
    scope: 'RuleSet';
    topicArn: string | null;
  } | null;
  addHeader: {
    headerName: string;
    headerValue: string;
  } | null;
  workmail: {
    organizationArn: string;
    topicArn: string | null;
  } | null;
  connect: {
    instanceArn: string;
    iamRoleArn: string;
  } | null;
}

export interface ReceiptRuleResolved {
  name: string;
  enabled: boolean;
  recipients: string[];
  tlsPolicy: 'Require' | 'Optional' | null;
  scanEnabled: boolean;
  actions: ReceiptActionResolved[];
}
