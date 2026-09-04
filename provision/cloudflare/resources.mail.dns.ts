import type { DeclastructProvider } from 'declastruct';
import {
  DeclaredCloudflareDomainDnsRecord,
  DeclaredCloudflareDomainZone,
  getDeclastructCloudflareProvider,
} from 'declastruct-cloudflare';
import { type DomainEntity, RefByUnique } from 'domain-objects';
import { BadRequestError } from 'helpful-errors';
import { keyrack } from 'rhachet/keyrack';
import { genLogMethods } from 'sdk-logs';

import { DeclaredAwsSesEmailIdentity } from '../../src/domain.objects/DeclaredAwsSesEmailIdentity';
import { asSesEmailIdentityDnsRecords } from '../../src/domain.operations/sesEmailIdentity/asSesEmailIdentityDnsRecords';

// source aws + cloudflare credentials from keyrack (lenient: absent keys do not throw here —
// getProviders fails loud with the exact fix if the cloudflare token is not filled)
keyrack.source({ env: 'prep', owner: 'ehmpath', mode: 'lenient' });

const log = genLogMethods();

// the mail (sub)domain, its SES region, and the cloudflare zone that holds its records
const MAIL_DOMAIN = 'demo.ehmpathy.com';
const REGION = 'us-east-1';
const ZONE = 'ehmpathy.com'; // the registered zone; demo.ehmpathy.com records live within it

/**
 * .what = the 3 easy-dkim tokens AWS emitted for the applied `demo.ehmpathy.com` SES identity.
 *   these are the ONLY dynamic values in the DNS set — AWS generates them at identity-create
 *   time and holds them stable for the life of the identity (they change only on a
 *   delete+recreate). the MX / SPF / DMARC records are static forms derived from the shared
 *   `asSesEmailIdentityDnsRecords` helper below, so this list is the sole hand-sourced input.
 * .source = the `setSesEmailIdentity.progress` apply log for `demo.ehmpathy.com`
 *   (metadata.dnsRecords), account 805192865516 / us-east-1, applied 2026-08-30.
 * .note = to refresh after a re-create: read the live identity's dkimTokens (the same values
 *   the apply log re-emits on every KEEP) and replace this list.
 */
const DKIM_TOKENS = [
  'cg3oejteyptk3iwftidh6bq5sr3xlgdh',
  'xrg2xqtwuv6k4vjf7lgfqqdv2wzvtekw',
  'bz46c5dsvuv4weix7vmno7euifutzcjw',
] as const;

/**
 * .what = maps ONE SES-owed dns record (the shared helper's shape) into a declared cloudflare
 *   dns record within the mail zone
 * .why = keeps the record forms DRY — the SAME `asSesEmailIdentityDnsRecords` helper that the
 *   SES apply uses to emit the copy-paste records is the single source of truth here, so a
 *   change to the MX/SPF/DMARC shape tracks on both sides automatically
 * .note = every record is dns-only (proxied: false) — cloudflare must NOT proxy mail records;
 *   ttl 1 = cloudflare automatic. MX carries a priority split out of the helper's `value`
 *   ('10 host' -> priority 10 + content 'host'), which is how cloudflare models an MX.
 */
const asCloudflareDnsRecord = (input: {
  record: { type: 'MX' | 'CNAME' | 'TXT'; name: string; value: string };
  zoneRef: RefByUnique<typeof DeclaredCloudflareDomainZone>;
}): DeclaredCloudflareDomainDnsRecord => {
  const { record, zoneRef } = input;

  // an MX value is 'PRIORITY HOST' — cloudflare wants the priority as its own field
  const isMx = record.type === 'MX';
  const [mxPriorityRaw, ...mxHostParts] = record.value.split(' ');
  const priority = isMx ? Number(mxPriorityRaw) : undefined;
  const content = isMx ? mxHostParts.join(' ') : record.value;

  return new DeclaredCloudflareDomainDnsRecord({
    zone: zoneRef,
    name: record.name,
    type: record.type,
    content,
    ttl: 1, // cloudflare automatic
    proxied: false, // mail records are dns-only (grey-cloud), never proxied
    priority,
  });
};

/**
 * .what = the cloudflare provider — the ONE step declastruct-aws cannot do (dns is a different
 *   provider). closes the vision's cross-provider seam so the whole mail stack is code-embedded
 * .why = reads CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID from the sourced keyrack env; fails
 *   loud with the exact fix if the token is absent, rather than a cryptic cloudflare 401 later
 */
export const getProviders = async (): Promise<DeclastructProvider[]> => {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!apiToken || !accountId)
    BadRequestError.throw(
      'cloudflare credentials absent — CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be filled in keyrack env=prep',
      {
        hint: 'create a cloudflare USER token (My Profile > API Tokens, NOT an account token) with Zone:Read + DNS:Edit, add both keys to .agent/keyrack.yml env.prep, then `rhx keyrack fill --owner ehmpath --env prep`',
        present: { apiToken: !!apiToken, accountId: !!accountId },
      },
    );

  return [
    await getDeclastructCloudflareProvider({ apiToken, accountId }, { log }),
  ];
};

/**
 * .what = the SES mail DNS records for `demo.ehmpathy.com`, declared as cloudflare resources:
 *   the inbound MX, the SPF TXT, the 3 easy-dkim CNAMEs, and the DMARC TXT
 * .why = a human once pasted these by hand; now they are declared, so `apply` writes them and
 *   `plan` proves they hold — the mail dogfood becomes reproducible end to end
 *
 * .note = derived from the SAME `asSesEmailIdentityDnsRecords` helper the SES apply uses. the
 *   helper needs only the identity's dkimTokens (above) — no live-AWS read at plan time, so the
 *   cloudflare plan does not couple to AWS reachability.
 */
export const getResources = async (): Promise<DomainEntity<any>[]> => {
  // the zone that holds the records (must already exist in cloudflare)
  const zone = new DeclaredCloudflareDomainZone({ name: ZONE, type: 'full' });
  const zoneRef = RefByUnique.as<typeof DeclaredCloudflareDomainZone>({
    name: ZONE,
  });

  // reconstruct the applied domain identity (its dkimTokens are the sole dynamic input), then
  // derive the exact 6 records it owes via the shared helper
  const identity = DeclaredAwsSesEmailIdentity.as({
    identity: MAIL_DOMAIN,
    dkim: 'enabled',
    mailFrom: null,
    tags: null,
    dkimTokens: [...DKIM_TOKENS],
  });
  const owed = asSesEmailIdentityDnsRecords({ identity, region: REGION });

  // declare each owed record as a cloudflare dns record in the zone
  const records = owed.map((record) =>
    asCloudflareDnsRecord({ record, zoneRef }),
  );

  // zone first (records ref it), then the records — declastruct applies in array order
  return [zone, ...records];
};
