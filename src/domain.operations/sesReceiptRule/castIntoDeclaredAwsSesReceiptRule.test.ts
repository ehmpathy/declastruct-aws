import type { ReceiptActionResolved } from '@src/access/sdks/sdkSes/ReceiptRuleResolved';

import { castIntoDeclaredAwsSesReceiptRule } from './castIntoDeclaredAwsSesReceiptRule';

/**
 * .what = unit coverage for the resolved → domain reversal (arns → refs), all 8 action kinds
 * .why = a re-plan compares domain objects, so every arn must reverse to the SAME ref the
 *   declaration used, or plan reports false drift. a swapped or dropped reversal in any of the
 *   8 kinds would ship silently; one action per kind pins the whole union
 */

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

const castWith = (action: ReceiptActionResolved) =>
  castIntoDeclaredAwsSesReceiptRule({
    ruleSetName: 'set-1',
    resolved: {
      name: 'to-x',
      enabled: true,
      recipients: ['inbox@demo.ehmpathy.com'],
      tlsPolicy: 'Require',
      scanEnabled: true,
      actions: [action],
    },
  });

describe('castIntoDeclaredAwsSesReceiptRule', () => {
  test('rule-level fields + ruleSet ref', () => {
    const rule = castWith({ ...emptyResolvedAction });
    expect(rule.name).toEqual('to-x');
    expect(rule.enabled).toEqual(true);
    expect(rule.recipients).toEqual(['inbox@demo.ehmpathy.com']);
    expect(rule.tlsPolicy).toEqual('Require');
    expect(rule.scanEnabled).toEqual(true);
    expect(rule.ruleSet.name).toEqual('set-1');
  });

  test('s3 arns → refs (bucket name + notify topic name)', () => {
    const { s3 } = castWith({
      ...emptyResolvedAction,
      s3: {
        bucketName: 'my-bucket',
        objectKeyPrefix: 'inbound/',
        topicArn: 'arn:aws:sns:us-east-1:111122223333:notify',
        kmsKeyArn: null,
      },
    }).actions[0]!;
    expect(s3!.bucket.name).toEqual('my-bucket');
    expect(s3!.objectKeyPrefix).toEqual('inbound/');
    expect(s3!.topic!.name).toEqual('notify');
    expect(s3!.kmsKeyArn).toEqual(null);
  });

  test('sns topic arn → ref', () => {
    const { sns } = castWith({
      ...emptyResolvedAction,
      sns: {
        topicArn: 'arn:aws:sns:us-east-1:111122223333:t',
        encodeAs: 'Base64',
      },
    }).actions[0]!;
    expect(sns!.topic.name).toEqual('t');
    expect(sns!.encodeAs).toEqual('Base64');
  });

  test('lambda raw arn kept, null topic → null', () => {
    const { lambda } = castWith({
      ...emptyResolvedAction,
      lambda: {
        functionArn: 'arn:aws:lambda:us-east-1:111122223333:function:f',
        topicArn: null,
        invocationType: 'Event',
      },
    }).actions[0]!;
    expect(lambda!.functionArn).toEqual(
      'arn:aws:lambda:us-east-1:111122223333:function:f',
    );
    expect(lambda!.topic).toEqual(null);
    expect(lambda!.invocationType).toEqual('Event');
  });

  test('bounce fields reverse', () => {
    const { bounce } = castWith({
      ...emptyResolvedAction,
      bounce: {
        smtpReplyCode: '550',
        statusCode: '5.1.1',
        message: 'no mailbox',
        sender: 'postmaster@demo.ehmpathy.com',
        topicArn: null,
      },
    }).actions[0]!;
    expect(bounce!.smtpReplyCode).toEqual('550');
    expect(bounce!.statusCode).toEqual('5.1.1');
    expect(bounce!.message).toEqual('no mailbox');
    expect(bounce!.sender).toEqual('postmaster@demo.ehmpathy.com');
    expect(bounce!.topic).toEqual(null);
  });

  test('stop scope reverses', () => {
    const { stop } = castWith({
      ...emptyResolvedAction,
      stop: { scope: 'RuleSet', topicArn: null },
    }).actions[0]!;
    expect(stop!.scope).toEqual('RuleSet');
    expect(stop!.topic).toEqual(null);
  });

  test('addHeader fields reverse', () => {
    const { addHeader } = castWith({
      ...emptyResolvedAction,
      addHeader: { headerName: 'X-Spam', headerValue: 'no' },
    }).actions[0]!;
    expect(addHeader!.headerName).toEqual('X-Spam');
    expect(addHeader!.headerValue).toEqual('no');
  });

  test('workmail organizationArn reverses', () => {
    const { workmail } = castWith({
      ...emptyResolvedAction,
      workmail: {
        organizationArn:
          'arn:aws:workmail:us-east-1:111122223333:organization/m-abc',
        topicArn: null,
      },
    }).actions[0]!;
    expect(workmail!.organizationArn).toEqual(
      'arn:aws:workmail:us-east-1:111122223333:organization/m-abc',
    );
    expect(workmail!.topic).toEqual(null);
  });

  test('connect arns reverse', () => {
    const { connect } = castWith({
      ...emptyResolvedAction,
      connect: {
        instanceArn: 'arn:aws:connect:us-east-1:111122223333:instance/abc',
        iamRoleArn: 'arn:aws:iam::111122223333:role/r',
      },
    }).actions[0]!;
    expect(connect!.instanceArn).toEqual(
      'arn:aws:connect:us-east-1:111122223333:instance/abc',
    );
    expect(connect!.iamRoleArn).toEqual('arn:aws:iam::111122223333:role/r');
  });
});
