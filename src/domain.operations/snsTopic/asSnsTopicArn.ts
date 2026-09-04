/**
 * .what = builds the deterministic topic arn from its name
 * .why = SNS arns carry no random suffix — `arn:aws:sns:<region>:<account>:<name>` — so a
 *   unique name derives the primary arn without a ListTopics scan
 */
export const asSnsTopicArn = (input: {
  name: string;
  account: string;
  region: string;
}): string => `arn:aws:sns:${input.region}:${input.account}:${input.name}`;
