# provision/cloudflare

declares the cloudflare dns records that complete the SES mail stack for
`demo.ehmpathy.com`.

## what it declares

`resources.mail.dns.ts` declares 6 dns records in the `ehmpathy.com` zone — the exact set
AWS SES needs for send + receive on `demo.ehmpathy.com`:

| type | name | value | purpose |
|------|------|-------|---------|
| MX | `demo.ehmpathy.com` | `10 inbound-smtp.us-east-1.amazonaws.com` | route inbound mail to SES |
| TXT | `demo.ehmpathy.com` | `v=spf1 include:amazonses.com ~all` | SPF — authorize SES to send |
| CNAME ×3 | `<token>._domainkey.demo.ehmpathy.com` | `<token>.dkim.amazonses.com` | easy-dkim signature |
| TXT | `_dmarc.demo.ehmpathy.com` | `v=DMARC1; p=none` | DMARC policy |

every record is **dns-only** (grey-cloud, `proxied: false`) — cloudflare must never proxy
mail records.

## why it exists

the SES mail stack (`provision/aws.infra/account=demo/resources.mail.ts`) declares the AWS
half. dns lives at a different provider (cloudflare), so a human once pasted these 6 records
by hand. this file declares them too — so `apply` writes them, `plan` proves they hold, and
the whole mail stack is code-embedded end to end. no console, no hand-paste.

## the DRY design

the records are NOT hand-typed here. they derive from the SAME
`asSesEmailIdentityDnsRecords` helper the SES apply uses to emit its copy-paste records. so a
change to the MX / SPF / DMARC shape tracks on both sides at once.

the ONLY hand-sourced input is the 3 easy-dkim tokens AWS emitted for the applied identity
(the `DKIM_TOKENS` const). AWS holds them stable for the life of the identity; they change
only on a delete+recreate.

**to refresh after an identity re-create**: read the live identity's `dkimTokens` (the same
values the SES apply re-emits on every KEEP) and replace `DKIM_TOKENS`.

## prereqs

### 1. a cloudflare USER token

create a **user** token — from **My Profile > API Tokens**, NOT an account token. an account
token throws `401 token type token != user`. full steps live in the canonical howto:
`declastruct-cloudflare/.agent/repo=.this/role=any/briefs/howto.cloudflare.api-tokens-and-keys.md`

for this dns-only wish, the minimal scopes are:

- **Zone - Zone - Read** — find the `ehmpathy.com` zone
- **Zone - DNS - Edit** — write the dns records

(the canonical `declastruct-cloudflare` token, which also carries Single Redirect / Registrar
/ Intel scopes, works too — it is a superset.)

grab the **account id** from any zone's dashboard sidebar (under "API"), or from the
dashboard url `dash.cloudflare.com/<account-id>/...`.

### 2. keyrack

the two keys are declared under `env.prep` in `.agent/keyrack.yml`:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

fill + unlock them:

```sh
rhx keyrack fill --owner ehmpath --env prep
rhx keyrack unlock --owner ehmpath --env prep
```

the wish sources them at run time via `keyrack.source({ env: 'prep', owner: 'ehmpath' })` —
the same pattern declastruct-cloudflare's own `getCredentials.ts` uses. it fails loud with
the exact fix if either key is absent.

## apply

```sh
rhx provision.declastruct \
  --wish provision/cloudflare/resources.mail.dns.ts \
  --env prep --mode plan

rhx provision.declastruct \
  --wish provision/cloudflare/resources.mail.dns.ts \
  --env prep --mode apply
```

`plan` shows CREATE for each absent record, KEEP for each already-present one. `apply` writes
them. a re-run converges to all KEEP (idempotent).

direct fallback (no skill): `rhx keyrack unlock --owner ehmpath --env prep` first, then
`npx declastruct plan --wish provision/cloudflare/resources.mail.dns.ts --into .temp/plan.json`.

## the zone

`ZONE = 'ehmpathy.com'` — the registered zone that holds the `demo.ehmpathy.com` records. the
wish declares it as a `DeclaredCloudflareDomainZone` reference; the zone must already exist in
cloudflare (this file does not create it). to point at a different zone, edit the `ZONE`
const.

## end to end

```
apply AWS mail stack ──▶ apply THIS dns wish ──▶ dkim CNAMEs land in cloudflare
                                                       │
                                   AWS polls dkim ──▶ identity verificationStatus flips to verified
                                                       │
                         receive: sender ▶ mx ▶ SES rule ▶ s3     send: SendRawEmail ▶ recipient
```

until the dkim CNAMEs propagate, the SES identity stays `verificationStatus: unresolved` — a
NORMAL `KEEP` state, not drift or an error.

## troubleshoot

| issue | fix |
|-------|-----|
| `cloudflare credentials absent` | `rhx keyrack fill --owner ehmpath --env prep`, then `unlock` |
| `401 token type token != user` | you made an account token — remake it as a **user** token (My Profile) |
| zone not found | confirm the `ZONE` const matches a zone that exists in cloudflare |
| identity stays `unresolved` | dkim CNAMEs not yet propagated (minutes to a few hours) — re-check later |
| dkim tokens stale after re-create | read the live identity's `dkimTokens`, replace `DKIM_TOKENS` |
