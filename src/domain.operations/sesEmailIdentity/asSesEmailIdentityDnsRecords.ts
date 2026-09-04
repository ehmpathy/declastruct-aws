import type { DeclaredAwsSesEmailIdentity } from '@src/domain.objects/DeclaredAwsSesEmailIdentity';

import { isSesEmailIdentityEmail } from './isSesEmailIdentityEmail';

/**
 * .what = one dns record the human pastes into their dns provider (e.g. cloudflare)
 * .note = local (not exported) — it types this file's own return shape only; a consumer that
 *   needs the element type derives it via ReturnType<typeof asSesEmailIdentityDnsRecords>[number]
 */
interface SesDnsRecord {
  type: 'MX' | 'CNAME' | 'TXT';
  name: string;
  value: string;
  purpose: string;
}

/**
 * .what = casts a resolved SES email identity into the copy-paste dns records the human owes
 * .why = the vision's "aha" — apply hands the human the exact records for the ONE step
 *   declastruct cannot do (dns lives in a different provider). pure computation over the
 *   applied identity's readonly fields, so it is unit-testable with no live-AWS dependency
 *
 * .note = v2 Easy DKIM proves domain ownership via the 3 dkim CNAMEs ALONE — there is NO
 *   separate `_amazonses` TXT ownership token (that was the v1 shape). an email-valued
 *   identity needs no dns, so it yields an empty list
 */
export const asSesEmailIdentityDnsRecords = (input: {
  identity: DeclaredAwsSesEmailIdentity;
  region: string;
}): SesDnsRecord[] => {
  // an email-valued identity (has an `@`) needs no dns records
  const isEmail = isSesEmailIdentityEmail({ identity: input.identity });
  if (isEmail) return [];

  const domain = input.identity.identity;
  const region = input.region;

  // the mx that routes inbound mail to SES, and the spf that authorizes SES to send
  const receiveAndSpf: SesDnsRecord[] = [
    {
      type: 'MX',
      name: domain,
      value: `10 inbound-smtp.${region}.amazonaws.com`,
      purpose: 'route inbound mail to SES',
    },
    {
      type: 'TXT',
      name: domain,
      value: 'v=spf1 include:amazonses.com ~all',
      purpose: 'spf — authorize SES to send',
    },
  ];

  // the 3 easy-dkim CNAMEs (domain ownership + dkim signature); empty until aws emits tokens
  const dkim: SesDnsRecord[] = (input.identity.dkimTokens ?? []).map(
    (token) => ({
      type: 'CNAME',
      name: `${token}._domainkey.${domain}`,
      value: `${token}.dkim.amazonses.com`,
      purpose: 'easy-dkim (ownership + signature)',
    }),
  );

  // the custom MAIL FROM records (only when a custom MAIL FROM is declared) for SPF/DMARC align
  const mailFrom: SesDnsRecord[] = input.identity.mailFrom
    ? [
        {
          type: 'MX',
          name: input.identity.mailFrom.domain,
          value: `10 feedback-smtp.${region}.amazonses.com`,
          purpose: 'custom MAIL FROM — SPF/DMARC alignment',
        },
        {
          type: 'TXT',
          name: input.identity.mailFrom.domain,
          value: 'v=spf1 include:amazonses.com ~all',
          purpose: 'custom MAIL FROM spf',
        },
      ]
    : [];

  // the dmarc policy record the vision's dns table promises. p=none is monitor-only — it
  // applies no enforcement, so it is safe to emit for every domain identity; a consumer who
  // wants aggregate reports adds their own `rua=mailto:...` mailbox (consumer-specific, so it
  // is not hard-coded here)
  const dmarc: SesDnsRecord[] = [
    {
      type: 'TXT',
      name: `_dmarc.${domain}`,
      value: 'v=DMARC1; p=none',
      purpose: 'dmarc policy (monitor mode)',
    },
  ];

  return [...receiveAndSpf, ...dkim, ...mailFrom, ...dmarc];
};
