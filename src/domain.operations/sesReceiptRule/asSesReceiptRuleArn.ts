/**
 * .what = builds the deterministic SES receipt-rule arn from its rule-set + rule names
 * .why = the bucket policy's `aws:SourceArn` must name the RECEIPT RULE (not the rule-set), and
 *   the arn carries no random suffix — so one named, tested function owns the exact shape
 *   instead of two hand-typed templates that can silently desync
 *   (`arn:aws:ses:<region>:<account>:receipt-rule-set/<ruleSet>:receipt-rule/<rule>`)
 */
export const asSesReceiptRuleArn = (input: {
  region: string;
  account: string;
  ruleSetName: string;
  ruleName: string;
}): string =>
  `arn:aws:ses:${input.region}:${input.account}:receipt-rule-set/${input.ruleSetName}:receipt-rule/${input.ruleName}`;
