# aws.infra / account=demo

provisions infrastructure resources in the demo account.

## resources

- `resources.vpc.ts` — VPC, subnets, security group, internet gateway, route tables
- `resources.iam.ts` — EC2 role + instance profile (SSM + self-hibernate)
- `resources.ec2.nat.ts` — NAT instance (egress for the private subnet)
- `resources.ec2.hibernator.ts` — SSH-able box that hibernates when idle
  (see `resources.ec2.hibernator.readme.md`)
- `resources.budget.ts` — monthly cost cap + tiered alerts + anomaly monitor
- `resources.ssm.ts` — plain + secure SSM parameters
- `resources.mail.ts` — the mail stack: SES email identity + S3 store + bucket
  policy + receipt rule set/rule + IAM robot role + config set/event destination
  (send + receive email for `demo.ehmpathy.com`). also applyable on its own via
  `--wish resources.mail.ts`. note: its SES/S3/SNS grants live in `demoPermissionsPolicy`,
  so both roles must be re-applied per `hazard.local-green-cicd-red` (see below)
- `resources.ts` — aggregates all above

## purpose

dogfood infrastructure resources with standard demo credentials (same as CI/CD).

verifies that `demoPermissionsPolicy` includes all required permissions.

## prereqs

1. demo account must exist (provision `aws.auth/account=.root` first)
2. OIDC role must have VPC permissions (provision `aws.auth/account=demo` first)

## apply

```bash
# authenticate (standard demo credentials, not admin)
use.ehmpathy.demo

# plan
npx declastruct plan \
  --wish provision/aws.infra/account=demo/resources.ts \
  --into provision/aws.infra/account=demo/.temp/plan.json

# apply
npx declastruct apply \
  --plan provision/aws.infra/account=demo/.temp/plan.json
```

## mail: the dns records you must paste

the one step declastruct cannot do is DNS — `demo.ehmpathy.com` lives at a different
provider (cloudflare). so `apply` of `resources.mail.ts` **prints the exact dns records to
paste** to stdout — a log line per domain identity:

```
SES identity "demo.ehmpathy.com" — paste these dns records into your dns provider to
complete verification
  { dnsRecords: [ { type: 'MX',    name: 'demo.ehmpathy.com', value: '10 inbound-smtp...' },
                  { type: 'TXT',   name: 'demo.ehmpathy.com', value: 'v=spf1 ...' },
                  { type: 'CNAME', name: '<token>._domainkey...', value: '<token>.dkim...' },
                  ... ] }
```

operator steps:

1. run `apply`; copy the `dnsRecords` from the log line above.
2. paste each into cloudflare as a **dns-only** (grey-cloud, NOT proxied) record.
3. wait for propagation, then check status — the identity's `verificationStatus` flips to
   `verified` once AWS sees the dkim CNAMEs (minutes to a few hours).
4. until then, `plan` shows the identity as `KEEP` with `verificationStatus: unresolved` —
   that is a NORMAL state, not drift or an error.

**lost the output?** just re-run `apply`. the records are re-emitted on every apply (the
`KEEP`/findsert path re-logs them for any not-yet-verified domain identity), so there is no
one-shot risk — you never have to hunt for a scrolled-past first-run log.

## verify each email address (inbox click)

a domain identity verifies via the DNS records above. an **email**-valued identity (the
send-from `robot@…`, the sandbox test recipient `qa@…`) verifies a different way: **AWS emails
a confirmation link to that address, and a human must open the inbox and click it.**

apply surfaces this the same way as the DNS hand-off — a loud `.warn` per not-yet-verified
address:

```
SES identity "robot@demo.ehmpathy.com" — AWS emailed a confirmation link to this address;
open that inbox and click the link to complete verification
```

operator step: open each address's inbox, find the AWS "Email Address Verification Request"
mail, and click the link. until you do, `verificationStatus` stays `unresolved` (a NORMAL
`KEEP` state, not drift) and — in the sandbox — mail to/from that address will not flow.

## send limits (SES sandbox)

a fresh AWS account starts in the **SES sandbox**: it can send ONLY to verified addresses and
at a low quota, ACCOUNT-WIDE, until production access is granted. that grant is a one-time AWS
support request (not a declastruct resource) — request it before this mailbox sends to
arbitrary external recipients.

## if permissions are absent

update `demoPermissionsPolicy` in `aws.auth/resources.common.ts`, then apply both:
1. `aws.auth/account=.root` (updates SSO permission set)
2. `aws.auth/account=demo` (updates OIDC role)

then retry this provision.
