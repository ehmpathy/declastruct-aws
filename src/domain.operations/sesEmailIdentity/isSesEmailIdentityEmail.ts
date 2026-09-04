import type { DeclaredAwsSesEmailIdentity } from '@src/domain.objects/DeclaredAwsSesEmailIdentity';

/**
 * .what = discriminates whether an SES identity value is an email address (vs a bare domain)
 * .why = AWS models domain and email identities as ONE resource, so every consumer that must
 *   branch on which kind an identity is — dns records owed (a domain) vs an inbox-click owed
 *   (an email) — shares this ONE check, so the discriminator cannot drift out of sync between
 *   the two manual hand-off surfaces (asSesEmailIdentityDnsRecords + emitSesEmailIdentityInboxVerification)
 * .note = an `@` is the discriminator AWS itself uses — an identity value with an `@` is an
 *   address, one without is a domain
 */
export const isSesEmailIdentityEmail = (input: {
  identity: DeclaredAwsSesEmailIdentity;
}): boolean => input.identity.identity.includes('@');
