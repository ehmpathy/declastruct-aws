import { DeclaredAwsSesEmailIdentity } from '@src/domain.objects/DeclaredAwsSesEmailIdentity';

import { isSesEmailIdentityEmail } from './isSesEmailIdentityEmail';

/**
 * .what = unit coverage for the ONE shared identity-kind discriminator
 * .why = both manual hand-off surfaces (dns-records + inbox-verification) branch on this check,
 *   so the two can never disagree about which manual step an identity owes — pin both kinds
 */
describe('isSesEmailIdentityEmail', () => {
  test('an email-valued identity is an email (has an `@`)', () => {
    const result = isSesEmailIdentityEmail({
      identity: DeclaredAwsSesEmailIdentity.as({
        identity: 'robot@demo.ehmpathy.com',
        dkim: 'disabled',
        mailFrom: null,
        tags: null,
        dkimTokens: [],
      }),
    });
    expect(result).toEqual(true);
  });

  test('a domain-valued identity is not an email (no `@`)', () => {
    const result = isSesEmailIdentityEmail({
      identity: DeclaredAwsSesEmailIdentity.as({
        identity: 'demo.ehmpathy.com',
        dkim: 'enabled',
        mailFrom: null,
        tags: null,
        dkimTokens: ['t1', 't2', 't3'],
      }),
    });
    expect(result).toEqual(false);
  });
});
