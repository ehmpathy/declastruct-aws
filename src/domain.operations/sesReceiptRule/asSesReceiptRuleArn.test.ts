import { asSesReceiptRuleArn } from './asSesReceiptRuleArn';

/**
 * .what = unit coverage for the deterministic ses receipt-rule arn derivation
 * .why = the bucket policy's SourceArn depends on this exact shape; a drift would fail SES's
 *   create-time test-put with an opaque AccessDenied. it MUST name the rule, nested under the
 *   rule-set, not the rule-set alone
 */
const cases = [
  {
    description: 'composes the rule arn nested under its rule-set',
    given: {
      region: 'us-east-1',
      account: '123456789012',
      ruleSetName: 'ehmpathy-mail-inbound',
      ruleName: 'to-s3',
    },
    expect:
      'arn:aws:ses:us-east-1:123456789012:receipt-rule-set/ehmpathy-mail-inbound:receipt-rule/to-s3',
  },
  {
    description: 'honors a non-default region',
    given: {
      region: 'eu-west-1',
      account: '000000000000',
      ruleSetName: 'set',
      ruleName: 'rule',
    },
    expect:
      'arn:aws:ses:eu-west-1:000000000000:receipt-rule-set/set:receipt-rule/rule',
  },
];

describe('asSesReceiptRuleArn', () => {
  cases.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asSesReceiptRuleArn(thisCase.given)).toEqual(thisCase.expect);
    }),
  );
});
