/**
 * .what = derives the deterministic SES identity arn from an identity value
 * .why = the tag ops key on the resource arn; SES assigns no separate id, so the arn is
 *   built from account + region + the identity value
 * .example = arn:aws:ses:us-east-1:123456789012:identity/demo.ehmpathy.com
 */
export const asSesEmailIdentityArn = (input: {
  identity: string;
  account: string;
  region: string;
}): string =>
  `arn:aws:ses:${input.region}:${input.account}:identity/${input.identity}`;
