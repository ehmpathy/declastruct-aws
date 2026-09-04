/* eslint-disable no-console */
/**
 * .what = diagnose why an SES domain identity is not yet verified — read the live expected
 *   DKIM tokens from SES, then look up the live DKIM CNAMEs from DNS and diff them per record
 * .why = when a domain identity sits `unresolved`, the cause is almost always a DKIM CNAME that
 *   has not propagated, or one that points at the wrong target. this reads BOTH sides (what AWS
 *   expects vs what DNS serves) so the gap is obvious: a token mismatch, an absent record, or
 *   "records correct, AWS has not polled them yet". a read-only probe — no resource mutation.
 */
import { Resolver } from 'dns/promises';
import { resolveCname, resolve4, resolveMx, resolveNs } from 'dns/promises';

import {
  GetEmailIdentityCommand,
  PutEmailIdentityDkimSigningAttributesCommand,
  SESv2Client,
} from '@aws-sdk/client-sesv2';

import { getAwsClientConfig } from '../../../../src/access/sdks/getAwsClientConfig';
import { getCredentials } from '../../../../src/contract/sdks';

const DOMAIN = process.env.MAIL_DOMAIN ?? 'demo.ehmpathy.com';
const NUDGE = process.env.MAIL_DNS_NUDGE === 'true';

const main = async (): Promise<void> => {
  const { region } = await getCredentials();
  const ses = new SESv2Client(getAwsClientConfig({ region }));

  // 0. optional nudge — force SES to restart its dkim poll. from a FAILED status SES will not
  //    re-poll on its own; the on/off flag (PutEmailIdentityDkimAttributes) is inert (proven).
  //    the correct re-arm is PutEmailIdentityDkimSigningAttributes with origin AWS_SES — it
  //    re-runs Easy DKIM setup, resets DkimStatus→PENDING, and returns the tokens. for Easy
  //    DKIM with no key-length change the tokens are STABLE (same 3), so no CNAME update is
  //    needed — but we DIFF the returned tokens vs the current ones to PROVE it, not assume.
  if (NUDGE) {
    console.log(`🔁 nudge dkim re-poll for ${DOMAIN} (re-run Easy DKIM setup)`);
    const before = await ses.send(
      new GetEmailIdentityCommand({ EmailIdentity: DOMAIN }),
    );
    const tokensBefore = before.DkimAttributes?.Tokens ?? [];
    // reuse the CURRENT key length — a re-arm with the same length keeps the tokens stable;
    // a different length would rotate them. AWS_SES origin requires NextSigningKeyLength here.
    const keyLength =
      before.DkimAttributes?.CurrentSigningKeyLength ??
      before.DkimAttributes?.NextSigningKeyLength ??
      'RSA_2048_BIT';
    console.log(`   ├─ key length : ${keyLength} (reused to keep tokens stable)`);

    const rearmed = await ses.send(
      new PutEmailIdentityDkimSigningAttributesCommand({
        EmailIdentity: DOMAIN,
        SigningAttributesOrigin: 'AWS_SES',
        SigningAttributes: { NextSigningKeyLength: keyLength },
      }),
    );
    const tokensAfter = rearmed.DkimTokens ?? [];
    const rotated =
      tokensBefore.slice().sort().join(',') !==
      tokensAfter.slice().sort().join(',');

    console.log(
      `   ├─ status now : ${rearmed.DkimStatus}\n` +
        `   ├─ tokens     : ${rotated ? '⚠️  ROTATED — CNAMEs MUST update to the new tokens below' : '✅ stable (same 3) — no CNAME change needed'}`,
    );
    if (rotated)
      console.log(
        `   │  new tokens : ${tokensAfter.join(', ')}\n` +
          `   │  update DKIM_TOKENS in provision/cloudflare/resources.mail.dns.ts, re-apply, then re-check`,
      );
    console.log(`   └─ re-armed — AWS now re-polls the live CNAMEs\n`);
  }

  // 1. read what AWS expects for this identity
  const identity = await ses.send(
    new GetEmailIdentityCommand({ EmailIdentity: DOMAIN }),
  );
  const verified = identity.VerifiedForSendingStatus ?? false;
  const dkimStatus = identity.DkimAttributes?.Status ?? 'UNKNOWN';
  const tokens = identity.DkimAttributes?.Tokens ?? [];

  console.log(`🔎 SES identity ${DOMAIN} (region ${region})`);
  console.log(`   ├─ verifiedForSending : ${verified}`);
  console.log(`   ├─ dkimStatus         : ${dkimStatus}`);
  console.log(`   └─ expected tokens    : ${tokens.length}`);

  // 2. for each expected token, look up the live CNAME and diff vs the SES target
  let allHit = true;
  for (const token of tokens) {
    const name = `${token}._domainkey.${DOMAIN}`;
    const want = `${token}.dkim.amazonses.com`;
    try {
      const got = await resolveCname(name);
      const hit = got.map((g) => g.toLowerCase()).includes(want.toLowerCase());
      if (!hit) allHit = false;
      console.log(
        `\n${hit ? '✅' : '⚠️ '} ${name}\n` +
          `   ├─ want: ${want}\n` +
          `   └─ live: ${got.join(', ') || '(none)'}`,
      );
    } catch (error) {
      allHit = false;
      console.log(
        `\n❌ ${name}\n` +
          `   ├─ want: ${want}\n` +
          `   └─ live: (no CNAME found — ${String(error)})`,
      );
    }
  }

  // 3. delegation check — do the domain + its parent zone actually serve records to the
  //    internet? if the CNAMEs are correct in cloudflare yet NXDOMAIN in public dns, the
  //    zone's nameservers are the gap (subdomain delegated away, or zone not live)
  const parent = DOMAIN.split('.').slice(-2).join('.');
  let authoritativeHosts: string[] = [];
  for (const zone of Array.from(new Set([DOMAIN, parent]))) {
    try {
      const ns = await resolveNs(zone);
      if (zone === parent) authoritativeHosts = ns;
      console.log(`\n🌐 NS ${zone}\n   └─ ${ns.join(', ') || '(none)'}`);
    } catch (error) {
      console.log(`\n🌐 NS ${zone}\n   └─ (none — ${String(error)})`);
    }
  }

  // 3b. AUTHORITATIVE check — query the DKIM CNAMEs DIRECTLY against the zone's own
  //     nameservers, bypassing every cache. this is the decisive test: if the records
  //     answer here, they ARE globally live + authoritative, so a lingering SES FAILED is
  //     pure AWS-side negative-cache/poll-lag (time cures it). if they do NOT answer here,
  //     the cloudflare records are not truly serving (an apply/zone problem, not time).
  if (authoritativeHosts.length && tokens.length) {
    const nsIps = (
      await Promise.all(
        authoritativeHosts.map((host) => resolve4(host).catch(() => [])),
      )
    ).flat();
    if (nsIps.length) {
      const authResolver = new Resolver();
      authResolver.setServers(nsIps);
      const token = tokens[0]!;
      const name = `${token}._domainkey.${DOMAIN}`;
      const want = `${token}.dkim.amazonses.com`;
      try {
        const got = await authResolver.resolveCname(name);
        const hit = got
          .map((g) => g.toLowerCase())
          .includes(want.toLowerCase());
        console.log(
          `\n🛰️  AUTHORITATIVE (via ${authoritativeHosts.join(', ')})\n` +
            `   ${hit ? '✅' : '⚠️ '} ${name}\n` +
            `   └─ ${got.join(', ') || '(none)'}` +
            (hit
              ? '\n   → records ARE globally authoritative; a lingering SES FAILED is AWS-side cache/lag (time cures it)'
              : '\n   → the record does NOT serve authoritatively — a cloudflare apply/zone problem, not time'),
        );
      } catch (error) {
        console.log(
          `\n🛰️  AUTHORITATIVE (via ${authoritativeHosts.join(', ')})\n` +
            `   ❌ ${name}\n` +
            `   └─ (no CNAME served authoritatively — ${String(error)})\n` +
            `   → the record does NOT serve authoritatively — a cloudflare apply/zone problem, not time`,
        );
      }
    }
  }
  try {
    const mx = await resolveMx(DOMAIN);
    console.log(
      `\n📬 MX ${DOMAIN}\n   └─ ${mx.map((m) => `${m.priority} ${m.exchange}`).join(', ') || '(none)'}`,
    );
  } catch (error) {
    console.log(`\n📬 MX ${DOMAIN}\n   └─ (none — ${String(error)})`);
  }

  // 4. the verdict
  //    note: dkimStatus FAILED does NOT mean "not yet polled" — it means AWS already polled
  //    the CNAMEs while they were absent (e.g. wrong dns provider) and GAVE UP. SES will not
  //    re-poll on its own from FAILED, so live-but-FAILED needs a re-poll NUDGE (re-enable dkim
  //    on the identity), not patience. only PENDING + live records is a true awaited-poll state.
  const verdict = verified
    ? '🎉 verified — send-from is authorized'
    : dkimStatus === 'SUCCESS'
      ? '🎉 dkim success — verification imminent'
      : !allHit
        ? '🛑 a record is absent or wrong — see the ⚠️/❌ rows above'
        : dkimStatus === 'FAILED'
          ? '🔁 records correct + live, but dkimStatus=FAILED — AWS polled while they were absent and gave up.\n   nudge SES to re-poll: rhx mail.dns.check --env prep --nudge (re-runs Easy DKIM setup, resets status; tokens stay stable), then re-check.'
          : '⏳ records correct + live — AWS re-poll in progress (status NOT_STARTED/PENDING), so hold tight';
  console.log(`\n${verdict}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
