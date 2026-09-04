import { DeclaredAwsSesEmailIdentity } from '@src/domain.objects/DeclaredAwsSesEmailIdentity';

import { asSesEmailIdentityDnsRecords } from './asSesEmailIdentityDnsRecords';

/**
 * .what = unit coverage for the identity -> copy-paste dns records cast
 * .why = this IS the vision's "aha" (apply hands the human the dns to paste); it pins the v2
 *   Easy-DKIM shape (3 CNAMEs, NO `_amazonses` TXT), the receive MX + spf, the mail-from
 *   records, and the email-identity empty case
 */
describe('asSesEmailIdentityDnsRecords', () => {
  test('a domain identity yields mx + spf + 3 dkim CNAMEs (no _amazonses TXT)', () => {
    const records = asSesEmailIdentityDnsRecords({
      identity: DeclaredAwsSesEmailIdentity.as({
        identity: 'demo.ehmpathy.com',
        dkim: 'enabled',
        mailFrom: null,
        tags: null,
        dkimTokens: ['t1', 't2', 't3'],
      }),
      region: 'us-east-1',
    });

    // the receive mx
    expect(records).toContainEqual({
      type: 'MX',
      name: 'demo.ehmpathy.com',
      value: '10 inbound-smtp.us-east-1.amazonaws.com',
      purpose: 'route inbound mail to SES',
    });
    // the spf
    expect(records).toContainEqual({
      type: 'TXT',
      name: 'demo.ehmpathy.com',
      value: 'v=spf1 include:amazonses.com ~all',
      purpose: 'spf — authorize SES to send',
    });
    // the 3 easy-dkim CNAMEs
    expect(records.filter((r) => r.type === 'CNAME')).toEqual([
      {
        type: 'CNAME',
        name: 't1._domainkey.demo.ehmpathy.com',
        value: 't1.dkim.amazonses.com',
        purpose: 'easy-dkim (ownership + signature)',
      },
      {
        type: 'CNAME',
        name: 't2._domainkey.demo.ehmpathy.com',
        value: 't2.dkim.amazonses.com',
        purpose: 'easy-dkim (ownership + signature)',
      },
      {
        type: 'CNAME',
        name: 't3._domainkey.demo.ehmpathy.com',
        value: 't3.dkim.amazonses.com',
        purpose: 'easy-dkim (ownership + signature)',
      },
    ]);
    // the dmarc policy record the vision's dns table promises (monitor mode)
    expect(records).toContainEqual({
      type: 'TXT',
      name: '_dmarc.demo.ehmpathy.com',
      value: 'v=DMARC1; p=none',
      purpose: 'dmarc policy (monitor mode)',
    });
    // NO v1-shaped _amazonses ownership TXT
    expect(records.some((r) => r.name.startsWith('_amazonses'))).toEqual(false);
  });

  test('a custom mail-from adds its mx + spf', () => {
    const records = asSesEmailIdentityDnsRecords({
      identity: DeclaredAwsSesEmailIdentity.as({
        identity: 'demo.ehmpathy.com',
        dkim: 'enabled',
        mailFrom: {
          domain: 'mail.demo.ehmpathy.com',
          behaviorOnMxFailure: 'REJECT_MESSAGE',
        },
        tags: null,
        dkimTokens: [],
      }),
      region: 'us-east-1',
    });
    expect(records).toContainEqual({
      type: 'MX',
      name: 'mail.demo.ehmpathy.com',
      value: '10 feedback-smtp.us-east-1.amazonses.com',
      purpose: 'custom MAIL FROM — SPF/DMARC alignment',
    });
  });

  test('an email identity needs no dns records', () => {
    const records = asSesEmailIdentityDnsRecords({
      identity: DeclaredAwsSesEmailIdentity.as({
        identity: 'robot@demo.ehmpathy.com',
        dkim: 'disabled',
        mailFrom: null,
        tags: null,
        dkimTokens: [],
      }),
      region: 'us-east-1',
    });
    expect(records).toEqual([]);
  });
});
