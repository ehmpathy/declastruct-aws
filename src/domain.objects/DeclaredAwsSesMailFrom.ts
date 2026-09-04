import { DomainLiteral } from 'domain-objects';

/**
 * .what = a custom MAIL FROM domain config on an SES email identity
 * .why = without a custom MAIL FROM, SPF authenticates against `amazonses.com`, so a strict
 *   DMARC receiver may reject the robot's mail; a custom MAIL FROM subdomain aligns SPF/DMARC
 *   (aws `MailFromAttributes`)
 */
export interface DeclaredAwsSesMailFrom {
  /**
   * .what = the custom MAIL FROM subdomain (adds its own MX + SPF TXT dns records)
   * .example = 'mail.demo.ehmpathy.com'
   */
  domain: string;

  /**
   * .what = what SES does when the MAIL FROM MX record cannot be read
   * .note = USE_DEFAULT_VALUE falls back to `amazonses.com`; REJECT_MESSAGE bounces the send
   */
  behaviorOnMxFailure: 'USE_DEFAULT_VALUE' | 'REJECT_MESSAGE';
}

export class DeclaredAwsSesMailFrom
  extends DomainLiteral<DeclaredAwsSesMailFrom>
  implements DeclaredAwsSesMailFrom {}
