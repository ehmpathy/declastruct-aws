import { RefByUnique } from 'domain-objects';

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

import { asReceiptRuleResolved } from './asReceiptRuleResolved';

/**
 * .what = unit coverage for the domain → resolved (refs → arns) derivation, all 8 action kinds
 * .why = every action's optional notify-topic ref becomes an arn here; a swapped ref field
 *   (or a topic left un-derived) would ship a broken arn silently. one action per kind proves
 *   the whole union round-trips, not just the s3 case the fixtures exercise
 */

const context = { account: '111122223333', region: 'us-east-1' };
const topicOf = (name: string) =>
  RefByUnique.as<typeof DeclaredAwsSnsTopic>({ name });

// a wrapper per kind (exactly one non-null), so one rule exercises the entire union
const emptyKinds = {
  s3: null,
  sns: null,
  lambda: null,
  bounce: null,
  stop: null,
  addHeader: null,
  workmail: null,
  connect: null,
};

describe('asReceiptRuleResolved', () => {
  const rule = DeclaredAwsSesReceiptRule.as({
    ruleSet: RefByUnique.as<typeof DeclaredAwsSesReceiptRuleSet>({
      name: 'set-1',
    }),
    name: 'to-x',
    enabled: true,
    recipients: ['inbox@demo.ehmpathy.com'],
    tlsPolicy: 'Require',
    scanEnabled: true,
    actions: [
      new DeclaredAwsSesReceiptAction({
        ...emptyKinds,
        s3: new DeclaredAwsSesReceiptActionS3({
          bucket: RefByUnique.as<typeof DeclaredAwsS3Bucket>({
            name: 'my-bucket',
          }),
          objectKeyPrefix: 'inbound/',
          topic: topicOf('notify'),
          kmsKeyArn: null,
        }),
      }),
      new DeclaredAwsSesReceiptAction({
        ...emptyKinds,
        sns: new DeclaredAwsSesReceiptActionSns({
          topic: topicOf('t'),
          encodeAs: 'Base64',
        }),
      }),
      new DeclaredAwsSesReceiptAction({
        ...emptyKinds,
        lambda: new DeclaredAwsSesReceiptActionLambda({
          functionArn: 'arn:aws:lambda:us-east-1:111122223333:function:f',
          topic: null,
          invocationType: 'Event',
        }),
      }),
      new DeclaredAwsSesReceiptAction({
        ...emptyKinds,
        bounce: new DeclaredAwsSesReceiptActionBounce({
          smtpReplyCode: '550',
          statusCode: '5.1.1',
          message: 'no mailbox',
          sender: 'postmaster@demo.ehmpathy.com',
          topic: null,
        }),
      }),
      new DeclaredAwsSesReceiptAction({
        ...emptyKinds,
        stop: new DeclaredAwsSesReceiptActionStop({
          scope: 'RuleSet',
          topic: null,
        }),
      }),
      new DeclaredAwsSesReceiptAction({
        ...emptyKinds,
        addHeader: new DeclaredAwsSesReceiptActionAddHeader({
          headerName: 'X-Spam',
          headerValue: 'no',
        }),
      }),
      new DeclaredAwsSesReceiptAction({
        ...emptyKinds,
        workmail: new DeclaredAwsSesReceiptActionWorkmail({
          organizationArn:
            'arn:aws:workmail:us-east-1:111122223333:organization/m-abc',
          topic: null,
        }),
      }),
      new DeclaredAwsSesReceiptAction({
        ...emptyKinds,
        connect: new DeclaredAwsSesReceiptActionConnect({
          instanceArn: 'arn:aws:connect:us-east-1:111122223333:instance/abc',
          iamRoleArn: 'arn:aws:iam::111122223333:role/r',
        }),
      }),
    ],
  });

  const resolved = asReceiptRuleResolved(rule, context);

  test('s3 ref → arns (bucket name + notify topic arn)', () => {
    expect(resolved.actions[0]!.s3).toEqual({
      bucketName: 'my-bucket',
      objectKeyPrefix: 'inbound/',
      topicArn: 'arn:aws:sns:us-east-1:111122223333:notify',
      kmsKeyArn: null,
    });
  });

  test('sns topic ref → arn', () => {
    expect(resolved.actions[1]!.sns).toEqual({
      topicArn: 'arn:aws:sns:us-east-1:111122223333:t',
      encodeAs: 'Base64',
    });
  });

  test('lambda passes raw arn, null topic → null', () => {
    expect(resolved.actions[2]!.lambda).toEqual({
      functionArn: 'arn:aws:lambda:us-east-1:111122223333:function:f',
      topicArn: null,
      invocationType: 'Event',
    });
  });

  test('bounce fields pass through', () => {
    expect(resolved.actions[3]!.bounce).toEqual({
      smtpReplyCode: '550',
      statusCode: '5.1.1',
      message: 'no mailbox',
      sender: 'postmaster@demo.ehmpathy.com',
      topicArn: null,
    });
  });

  test('stop scope passes through', () => {
    expect(resolved.actions[4]!.stop).toEqual({
      scope: 'RuleSet',
      topicArn: null,
    });
  });

  test('addHeader fields pass through', () => {
    expect(resolved.actions[5]!.addHeader).toEqual({
      headerName: 'X-Spam',
      headerValue: 'no',
    });
  });

  test('workmail organizationArn passes through', () => {
    expect(resolved.actions[6]!.workmail).toEqual({
      organizationArn:
        'arn:aws:workmail:us-east-1:111122223333:organization/m-abc',
      topicArn: null,
    });
  });

  test('connect arns pass through', () => {
    expect(resolved.actions[7]!.connect).toEqual({
      instanceArn: 'arn:aws:connect:us-east-1:111122223333:instance/abc',
      iamRoleArn: 'arn:aws:iam::111122223333:role/r',
    });
  });
});
