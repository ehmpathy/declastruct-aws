/**
 * .what = derives the deterministic SES configuration-set arn from its name
 * .why = the tag ops key on the resource arn; SES assigns no separate id, so the arn is
 *   built from account + region + the set name
 * .example = arn:aws:ses:us-east-1:123456789012:configuration-set/ehmpathy-mail
 */
export const asSesConfigurationSetArn = (input: {
  name: string;
  account: string;
  region: string;
}): string =>
  `arn:aws:ses:${input.region}:${input.account}:configuration-set/${input.name}`;
