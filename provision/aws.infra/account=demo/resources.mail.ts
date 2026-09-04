import type { DeclastructProvider } from 'declastruct';
import { type DomainEntity, RefByUnique } from 'domain-objects';
import { keyrack } from 'rhachet/keyrack';
import { genLogMethods } from 'sdk-logs';

import {
  asSesReceiptRuleArn,
  DeclaredAwsIamRole,
  DeclaredAwsIamRolePolicyAttachedInline,
  DeclaredAwsS3Bucket,
  DeclaredAwsS3BucketPolicy,
  DeclaredAwsSesAccountDetails,
  DeclaredAwsSesConfigurationSet,
  DeclaredAwsSesConfigurationSetEventDestination,
  DeclaredAwsSesEmailIdentity,
  DeclaredAwsSesReceiptRule,
  DeclaredAwsSesReceiptRuleSet,
  getCredentials,
  getDeclastructAwsProvider,
} from '../../../src/contract/sdks';

// source aws credentials from keyrack
keyrack.source({ env: 'prep', owner: 'ehmpath', mode: 'lenient' });

const log = genLogMethods();

// the mail (sub)domain + the resource names this dogfood provisions
const MAIL_DOMAIN = 'demo.ehmpathy.com';
// the echo mailbox — mail sent here lands in s3, and the echo.reply skill replies with a
// random 🐢/🦫/🦉. ONE address for both legs: receive (a recipient string on the rule) and
// send-from (covered by the verified DOMAIN identity, so it needs no own email identity)
const ECHO = `echo@${MAIL_DOMAIN}`;
const BUCKET = 'ehmpathy-mail-inbound-demo';
const RULE_SET = 'ehmpathy-mail-inbound';
const RULE = 'to-s3';
const CONFIG_SET = 'ehmpathy-mail-events';
// an OPTIONAL sandbox test recipient — an EMAIL-value identity (verified via a click-link AWS
// emails to the address, no dns), so echo can REPLY to it while the account is in the SES
// sandbox. sourced from an env var so no personal address is hard-coded here; unset = the
// resource is skipped entirely. now that the account has production access, echo can send to
// ANY recipient, so this is a convenience for a sandbox re-test, not a requirement.
const TEST_RECIPIENT = process.env.SES_TEST_RECIPIENT ?? null;

/**
 * .what = dogfood the SES + S3 mail primitives — a robot mailbox on demo.ehmpathy.com that
 *   receives to s3 and can send out, authed via a dedicated declared role. composed into the
 *   demo aggregate (`resources.ts`) so the normal `apply --wish resources.ts` path exercises it
 * .why = proves the whole mail stack is declarative + reproducible, and verifies the demo
 *   role carries the SES/S3/SNS grants (per hazard.local-green-cicd-red)
 *
 * @see .behavior/v2026_07_29.ses-emails/1.vision.yield.md (the day-in-the-life this mirrors)
 * @see readme.md for prereqs and apply instructions
 *
 * .note = a domain identity's apply emits the copy-paste dns records via setSesEmailIdentity
 *   (the vision's "aha") — v2 Easy DKIM: an MX (inbound receive), an SPF TXT, and 3 dkim
 *   CNAMEs. there is NO separate `_amazonses` TXT ownership token (that was the v1 shape);
 *   Easy DKIM proves ownership via the 3 CNAMEs alone. a domain-valued identity stays
 *   `verificationStatus: unresolved` until the dns propagates.
 */
export const getResourcesOfMail = (input: {
  account: string;
  region: string;
}): DomainEntity<any>[] => {
  const { account, region } = input;

  // the bucket policy's SourceArn must name the RECEIPT RULE arn (deterministic from names)
  const receiptRuleArn = asSesReceiptRuleArn({
    region,
    account,
    ruleSetName: RULE_SET,
    ruleName: RULE,
  });

  // 1. the domain identity — emits the dkim tokens the human pastes into cloudflare
  const identity = DeclaredAwsSesEmailIdentity.as({
    identity: MAIL_DOMAIN,
    dkim: 'enabled',
    mailFrom: null,
    tags: { managedBy: 'declastruct', purpose: 'mail' },
  });

  // 2. the inbound store — glacier staircase lifecycle (Standard -> GLACIER_IR -> DEEP_ARCHIVE)
  const store = DeclaredAwsS3Bucket.as({
    name: BUCKET,
    lifecycle: {
      transitions: [
        { afterDays: 30, class: 'GLACIER_IR' },
        { afterDays: 180, class: 'DEEP_ARCHIVE' },
      ],
      expireAfterDays: null,
    },
    tags: { managedBy: 'declastruct', purpose: 'mail' },
  });

  // 3. the bucket policy — allow SES (this account only) to PutObject into inbound/
  const storePolicy = DeclaredAwsS3BucketPolicy.as({
    bucket: RefByUnique.as<typeof DeclaredAwsS3Bucket>({ name: BUCKET }),
    document: {
      statements: [
        {
          sid: 'AllowSesPut',
          effect: 'Allow',
          principal: { service: 'ses.amazonaws.com' },
          action: 's3:PutObject',
          resource: `arn:aws:s3:::${BUCKET}/inbound/*`,
          condition: {
            StringEquals: { 'aws:SourceAccount': account },
            ArnLike: { 'aws:SourceArn': receiptRuleArn },
          },
        },
      ],
    },
  });

  // 4. the receipt rule set — the account's active set
  const ruleSet = DeclaredAwsSesReceiptRuleSet.as({
    name: RULE_SET,
    active: true,
  });

  // 5. the receipt rule — route inbound mail for ECHO to the s3 inbound/ prefix
  const rule = DeclaredAwsSesReceiptRule.as({
    ruleSet: RefByUnique.as<typeof DeclaredAwsSesReceiptRuleSet>({
      name: RULE_SET,
    }),
    name: RULE,
    enabled: true,
    recipients: [ECHO],
    actions: [
      {
        s3: {
          bucket: RefByUnique.as<typeof DeclaredAwsS3Bucket>({ name: BUCKET }),
          objectKeyPrefix: 'inbound/',
          topic: null,
          kmsKeyArn: null,
        },
        sns: null,
        lambda: null,
        bounce: null,
        stop: null,
        addHeader: null,
        workmail: null,
        connect: null,
      },
    ],
    // AWS materializes TlsPolicy to 'Optional' by default (it is never absent), so declare
    // the real default explicitly — a null desired would drift to a perpetual UPDATE against
    // the 'Optional' AWS returns (rule.require.guaranteed-idempotency)
    tlsPolicy: 'Optional',
    scanEnabled: true,
  });

  // 6. the robot's dedicated role + a least-privilege grant (send scoped to the subdomain)
  const robotRole = DeclaredAwsIamRole.as({
    name: 'ehmpathy-mail-robot',
    path: '/',
    description: 'Role the mail robot assumes to read inbound + send',
    policies: [
      {
        effect: 'Allow',
        principal: { service: 'ec2.amazonaws.com' },
        action: 'sts:AssumeRole',
      },
    ],
    tags: { managedBy: 'declastruct', purpose: 'mail' },
  });
  const robotGrant = DeclaredAwsIamRolePolicyAttachedInline.as({
    name: 'mail-send-read',
    role: RefByUnique.as<typeof DeclaredAwsIamRole>({
      name: 'ehmpathy-mail-robot',
    }),
    document: {
      statements: [
        {
          effect: 'Allow',
          action: 's3:GetObject',
          resource: `arn:aws:s3:::${BUCKET}/inbound/*`,
        },
        {
          effect: 'Allow',
          action: 'ses:SendRawEmail',
          resource: '*',
          condition: { StringLike: { 'ses:FromAddress': `*@${MAIL_DOMAIN}` } },
        },
      ],
    },
  });

  // 7. the send-event capture — a config set + a cloudwatch event destination (no new resource)
  const configSet = DeclaredAwsSesConfigurationSet.as({
    name: CONFIG_SET,
    tags: { managedBy: 'declastruct', purpose: 'mail' },
  });
  const eventDest = DeclaredAwsSesConfigurationSetEventDestination.as({
    configurationSet: RefByUnique.as<typeof DeclaredAwsSesConfigurationSet>({
      name: CONFIG_SET,
    }),
    name: 'to-cloudwatch',
    enabled: true,
    // order here does not matter — the domain object's constructor sorts eventTypes to a
    // canonical order (asCanonicalSesEventTypes), the same order the AWS read-back is cast to, so
    // declastruct's order-sensitive compare converges to KEEP no matter how they are declared
    // (rule.require.guaranteed-idempotency)
    eventTypes: [
      'BOUNCE',
      'CLICK',
      'COMPLAINT',
      'DELIVERY',
      'OPEN',
      'REJECT',
      'SEND',
    ],
    sink: {
      cloudwatch: [
        {
          name: 'ses:configuration-set',
          source: 'MESSAGE_TAG',
          defaultValue: CONFIG_SET,
        },
      ],
      sns: null,
    },
  });

  // 8. an OPTIONAL sandbox test recipient — an EMAIL-value identity (no dkim, no mail-from). a
  //   fresh apply asks AWS to email a verify link to the address; it stays unverified (a normal
  //   KEEP) until the human clicks it. this lets echo reply to it while the account is in the
  //   sandbox. declared ONLY when SES_TEST_RECIPIENT names an address — else skipped, so no
  //   personal email is hard-coded here and the common (production-access) path needs none.
  const testRecipient = TEST_RECIPIENT
    ? DeclaredAwsSesEmailIdentity.as({
        identity: TEST_RECIPIENT,
        dkim: 'disabled',
        mailFrom: null,
        tags: { managedBy: 'declastruct', purpose: 'mail' },
      })
    : null;

  // 9. the sandbox exit — request production access so echo can send to ANY recipient (not
  //   just verified ones). AWS REVIEWS the request (it does not flip inline), so a fresh apply
  //   lands an unresolved review — a normal KEEP; the human reads reviewStatus for the verdict
  const accountDetails = DeclaredAwsSesAccountDetails.as({
    region,
    productionAccess: 'enabled',
    mailType: 'TRANSACTIONAL',
    websiteUrl: 'https://ehmpathy.com',
    contactLanguage: 'EN',
    additionalContactEmails: null,
  });

  // apply order = declared array order (declastruct does no topological sort):
  //   identity -> bucket -> bucketPolicy -> ruleSet -> rule (SES test-puts the bucket, so the
  //   bucket + policy must exist first) -> iam -> config set + event destination -> recipient
  //   -> account details (the account-level sandbox exit; free of any resource dependency)
  //   the test recipient is spread in only when SES_TEST_RECIPIENT is set (else skipped)
  return [
    identity,
    store,
    storePolicy,
    ruleSet,
    rule,
    robotRole,
    robotGrant,
    configSet,
    eventDest,
    ...(testRecipient ? [testRecipient] : []),
    accountDetails,
  ];
};

/**
 * .what = the standalone-wish entrypoints, so `apply --wish resources.mail.ts` still works
 * .why = the mail stack is BOTH composed into the demo aggregate (via getResourcesOfMail) AND
 *   applyable on its own; this wrapper resolves account+region from the provider, then defers
 *   to getResourcesOfMail
 */
export const getProviders = async (): Promise<DeclastructProvider[]> => [
  await getDeclastructAwsProvider({}, { log }),
];

export const getResources = async (): Promise<DomainEntity<any>[]> => {
  // read account + region via the CHEAP credential lookup (region from env/config + account
  // from STS) — NOT a second full provider build, which would re-construct the whole ~60-entry
  // DAO map just to read two strings
  const { account, region } = await getCredentials();
  return getResourcesOfMail({ account, region });
};
