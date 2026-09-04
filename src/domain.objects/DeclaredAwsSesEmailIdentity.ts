import { DomainEntity } from 'domain-objects';
import { withAssure } from 'type-fns';

import { DeclaredAwsSesMailFrom } from './DeclaredAwsSesMailFrom';
import { DeclaredAwsTags } from './DeclaredAwsTags';

/**
 * .what = the aws easy-dkim states SES reports for an identity
 * .why = the read boundary maps SES's DkimStatus enum; a closed union gives compile-time
 *   typo protection + symmetry with the other aws-enum fields in the family
 */
export const SES_DKIM_STATUSES = [
  'PENDING',
  'SUCCESS',
  'FAILED',
  'TEMPORARY_FAILURE',
  'NOT_STARTED',
] as const;

export type SesDkimStatus = (typeof SES_DKIM_STATUSES)[number];

/**
 * .what = guards a raw SES dkim-status string into the modeled union
 * .why = a value outside our union must fail loud at the read boundary (assure), not
 *   silently mistype and skew a plan diff (rule.require.assure-via-type-checks)
 */
export const isSesDkimStatus = withAssure(
  (value: string): value is SesDkimStatus =>
    (SES_DKIM_STATUSES as readonly string[]).includes(value),
  { name: 'isSesDkimStatus' },
);

/**
 * .what = a verified SES identity — a whole domain OR a single email address
 * .why = AWS models domain and email identities as ONE resource (`AWS::SES::EmailIdentity`);
 *   a domain value emits DKIM tokens the human pastes into dns, an email value is a plain
 *   verify. serves the mail domain, the send-from address, and the sandbox test recipient
 *
 * .identity
 *   - @unique = [identity] — the domain or email string is globally the natural key
 *   - @primary = [identity] — SES assigns no separate id; the identity IS the key
 *
 * .note
 *   - readonly fields are emitted by aws: a domain value yields `dkimTokens[3]` +
 *     `dkimStatus`; an email value yields an empty token list. `verificationStatus` is the
 *     reason to declare an identity — the human reads it to know when dns has propagated
 *   - a fresh apply legitimately reads `verificationStatus: 'unresolved'` until the human
 *     pastes dns — that is a normal KEEP state, not drift (the acceptance bar)
 */
export interface DeclaredAwsSesEmailIdentity {
  /**
   * .what = the identity value — a domain or an email address
   * .note = @unique + @primary
   * .example = 'demo.ehmpathy.com' (domain) or 'robot@demo.ehmpathy.com' (email)
   */
  identity: string;

  /**
   * .what = whether easy-dkim is on (domain identities only; a no-op for an email)
   */
  dkim: 'enabled' | 'disabled';

  /**
   * .what = the custom MAIL FROM domain config for strict SPF/DMARC alignment
   * .note = null = no custom MAIL FROM (SPF authenticates against amazonses.com)
   */
  mailFrom: DeclaredAwsSesMailFrom | null;

  /**
   * .what = the tags applied to the identity
   * .note = null = no tags
   */
  tags: DeclaredAwsTags | null;

  /**
   * .what = the aws verification state
   * .note = @readonly — 'verified' once dns has propagated, else 'unresolved'
   */
  verificationStatus?: 'verified' | 'unresolved';

  /**
   * .what = the 3 easy-dkim CNAME tokens the human pastes into dns (domain identities)
   * .note = @readonly — an empty list for an email identity
   */
  dkimTokens?: string[];

  /**
   * .what = the aws dkim state (domain identities)
   * .note = @readonly — null for an email identity
   */
  dkimStatus?: SesDkimStatus | null;
}

export class DeclaredAwsSesEmailIdentity
  extends DomainEntity<DeclaredAwsSesEmailIdentity>
  implements DeclaredAwsSesEmailIdentity
{
  /**
   * .what = SES assigns no separate id; the identity value IS the key
   */
  public static primary = ['identity'] as const;

  /**
   * .what = the domain or email string is the natural unique key
   */
  public static unique = ['identity'] as const;

  /**
   * .what = no aws-assigned identity attributes
   */
  public static metadata = [] as const;

  /**
   * .what = aws-populated attributes read back from the identity
   */
  public static readonly = [
    'verificationStatus',
    'dkimTokens',
    'dkimStatus',
  ] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    mailFrom: DeclaredAwsSesMailFrom,
    tags: DeclaredAwsTags,
  };
}
