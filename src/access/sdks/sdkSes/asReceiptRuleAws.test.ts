import { asReceiptRuleAws } from './asReceiptRuleAws';
import type { ReceiptActionResolved } from './ReceiptRuleResolved';

/**
 * .what = unit coverage for the resolved → aws sdk-shape builder across ALL 8 action kinds
 * .why = the 8-way receipt-action union is the highest-complexity transformer in the mail
 *   stack; each kind maps a distinct field set into a distinct aws `*Action` shape, so a
 *   swapped field (e.g. TopicArn vs FunctionArn) would ship silently without per-kind coverage
 */

// an all-null resolved action; each case overrides exactly one kind (the wire invariant)
const emptyResolvedAction: ReceiptActionResolved = {
  s3: null,
  sns: null,
  lambda: null,
  bounce: null,
  stop: null,
  addHeader: null,
  workmail: null,
  connect: null,
};

const asRuleWith = (action: ReceiptActionResolved) =>
  asReceiptRuleAws({
    name: 'to-x',
    enabled: true,
    recipients: ['inbox@demo.ehmpathy.com'],
    tlsPolicy: 'Require',
    scanEnabled: true,
    actions: [action],
  });

// the single aws action built from a one-kind resolved action
const firstActionOf = (action: ReceiptActionResolved) =>
  asRuleWith(action).Actions![0]!;

describe('asReceiptRuleAws', () => {
  test('rule-level fields map to the aws shape', () => {
    const rule = asRuleWith({ ...emptyResolvedAction });
    expect(rule.Name).toEqual('to-x');
    expect(rule.Enabled).toEqual(true);
    expect(rule.Recipients).toEqual(['inbox@demo.ehmpathy.com']);
    expect(rule.TlsPolicy).toEqual('Require');
    expect(rule.ScanEnabled).toEqual(true);
  });

  test('s3 action → S3Action', () => {
    const aws = firstActionOf({
      ...emptyResolvedAction,
      s3: {
        bucketName: 'my-bucket',
        objectKeyPrefix: 'inbound/',
        topicArn: 'arn:aws:sns:us-east-1:111122223333:notify',
        kmsKeyArn: 'arn:aws:kms:us-east-1:111122223333:key/abc',
      },
    });
    expect(aws.S3Action).toEqual({
      BucketName: 'my-bucket',
      ObjectKeyPrefix: 'inbound/',
      TopicArn: 'arn:aws:sns:us-east-1:111122223333:notify',
      KmsKeyArn: 'arn:aws:kms:us-east-1:111122223333:key/abc',
    });
    expect(aws.SNSAction).toBeUndefined();
  });

  test('sns action → SNSAction', () => {
    const aws = firstActionOf({
      ...emptyResolvedAction,
      sns: {
        topicArn: 'arn:aws:sns:us-east-1:111122223333:t',
        encodeAs: 'Base64',
      },
    });
    expect(aws.SNSAction).toEqual({
      TopicArn: 'arn:aws:sns:us-east-1:111122223333:t',
      Encoding: 'Base64',
    });
  });

  test('lambda action → LambdaAction', () => {
    const aws = firstActionOf({
      ...emptyResolvedAction,
      lambda: {
        functionArn: 'arn:aws:lambda:us-east-1:111122223333:function:f',
        topicArn: null,
        invocationType: 'Event',
      },
    });
    expect(aws.LambdaAction).toEqual({
      FunctionArn: 'arn:aws:lambda:us-east-1:111122223333:function:f',
      TopicArn: undefined,
      InvocationType: 'Event',
    });
  });

  test('bounce action → BounceAction', () => {
    const aws = firstActionOf({
      ...emptyResolvedAction,
      bounce: {
        smtpReplyCode: '550',
        statusCode: '5.1.1',
        message: 'mailbox does not exist',
        sender: 'postmaster@demo.ehmpathy.com',
        topicArn: null,
      },
    });
    expect(aws.BounceAction).toEqual({
      SmtpReplyCode: '550',
      StatusCode: '5.1.1',
      Message: 'mailbox does not exist',
      Sender: 'postmaster@demo.ehmpathy.com',
      TopicArn: undefined,
    });
  });

  test('stop action → StopAction', () => {
    const aws = firstActionOf({
      ...emptyResolvedAction,
      stop: { scope: 'RuleSet', topicArn: null },
    });
    expect(aws.StopAction).toEqual({ Scope: 'RuleSet', TopicArn: undefined });
  });

  test('addHeader action → AddHeaderAction', () => {
    const aws = firstActionOf({
      ...emptyResolvedAction,
      addHeader: { headerName: 'X-Spam', headerValue: 'no' },
    });
    expect(aws.AddHeaderAction).toEqual({
      HeaderName: 'X-Spam',
      HeaderValue: 'no',
    });
  });

  test('workmail action → WorkmailAction', () => {
    const aws = firstActionOf({
      ...emptyResolvedAction,
      workmail: {
        organizationArn:
          'arn:aws:workmail:us-east-1:111122223333:organization/m-abc',
        topicArn: null,
      },
    });
    expect(aws.WorkmailAction).toEqual({
      OrganizationArn:
        'arn:aws:workmail:us-east-1:111122223333:organization/m-abc',
      TopicArn: undefined,
    });
  });

  test('connect action → ConnectAction', () => {
    const aws = firstActionOf({
      ...emptyResolvedAction,
      connect: {
        instanceArn: 'arn:aws:connect:us-east-1:111122223333:instance/abc',
        iamRoleArn: 'arn:aws:iam::111122223333:role/r',
      },
    });
    expect(aws.ConnectAction).toEqual({
      InstanceARN: 'arn:aws:connect:us-east-1:111122223333:instance/abc',
      IAMRoleARN: 'arn:aws:iam::111122223333:role/r',
    });
  });
});
