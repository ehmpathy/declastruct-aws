/* eslint-disable no-console */
/**
 * .what = the echo mailbox responder — reads the NEWEST inbound message in the mail bucket,
 *   picks a random 🐢/🦫/🦉, and sends a reply back to the original sender
 * .why = the dogfood that proves BOTH legs of the mail stack in ONE shot: inbound (a real
 *   message landed in s3 via mx -> receipt rule) + outbound (a real SendEmail from the verified
 *   domain). this is a downstream CONSUMER of the declared primitives, NOT a declared resource
 *   itself — the vision scopes the responder body out of the wish, so it lives as a skill. it
 *   later becomes the reference body for the lambda north-star (a `lambda` receipt action that
 *   acts on the file), so it is groundwork, not throwaway.
 * .note = LIVE — reads real s3 objects + sends a real email. SES SANDBOX delivers only to
 *   VERIFIED recipients, so the reply reaches the sender only once that address is verified (or
 *   the account has production access). a MessageRejected on an unverified sender is expected in
 *   sandbox and is surfaced with that exact hint.
 */
import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';

import { getAwsClientConfig } from '../../../../src/access/sdks/getAwsClientConfig';
import { getCredentials } from '../../../../src/contract/sdks';

// the echo mailbox — defaults match provision/aws.infra/account=demo/resources.mail.ts;
// override via env for a different (sub)domain deployment
const BUCKET = process.env.ECHO_BUCKET ?? 'ehmpathy-mail-inbound-demo';
const FROM = process.env.ECHO_FROM ?? 'echo@demo.ehmpathy.com';
const PREFIX = 'inbound/';

// the three org mascots — the random pick that proves the responder ran
const CRITTERS = [
  {
    emoji: '🐢',
    name: 'seaturtle',
    line: 'slow and steady — your message drifted into the echo mailbox and rode the current back out.',
  },
  {
    emoji: '🦫',
    name: 'beaver',
    line: 'your message built a dam in the echo mailbox, and this reply flowed downstream.',
  },
  {
    emoji: '🦉',
    name: 'owl',
    line: 'whoo goes there? the echo mailbox saw your message and hooted right back.',
  },
] as const;

/**
 * .what = the header block of a raw rfc822 message, unfolded + lowercased-keyed
 * .why = SES writes the full raw message to s3; a reply needs From/Subject/Message-ID out of it.
 *   headers end at the first blank line; a continuation line (a whitespace-prefixed line) folds
 *   onto the prior header, so unfold before split
 */
const parseHeaders = (raw: string): Record<string, string> => {
  const headerBlock = raw.split(/\r?\n\r?\n/)[0] ?? '';
  const unfolded = headerBlock.replace(/\r?\n[ \t]+/g, ' ');
  const headers: Record<string, string> = {};
  for (const line of unfolded.split(/\r?\n/)) {
    const match = line.match(/^([^:]+):\s?(.*)$/);
    if (!match) continue;
    headers[match[1]!.toLowerCase()] = match[2]!.trim();
  }
  return headers;
};

/**
 * .what = the bare email address out of a `Name <addr@x>` or `addr@x` header value
 */
const asBareAddress = (value: string): string => {
  const angled = value.match(/<([^>]+)>/);
  return (angled ? angled[1]! : value).trim();
};

/**
 * .what = a Subject with exactly one `Re:` prefix (no `Re: Re:` stack)
 */
const asReplySubject = (subject: string): string =>
  /^re:/i.test(subject.trim()) ? subject.trim() : `Re: ${subject.trim() || '(no subject)'}`;

const main = async (): Promise<void> => {
  const { region } = await getCredentials();
  const s3 = new S3Client(getAwsClientConfig({ region }));
  const ses = new SESv2Client(getAwsClientConfig({ region }));

  // 1. find the newest inbound object (SES writes one object per received message)
  const listed = await s3.send(
    new ListObjectsV2Command({ Bucket: BUCKET, Prefix: PREFIX }),
  );
  const objects = (listed.Contents ?? []).filter(
    (object) => object.Key && object.Key !== PREFIX && !object.Key.endsWith('/'),
  );
  if (!objects.length) {
    console.log(
      `🐢 echo mailbox empty — no inbound mail under s3://${BUCKET}/${PREFIX} yet.\n` +
        `   send a test email to ${FROM} (from a VERIFIED address while in sandbox), then re-run.`,
    );
    return;
  }
  const newest = objects.sort(
    (a, b) =>
      (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0),
  )[0]!;

  // 2. read + parse the raw message
  const got = await s3.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: newest.Key! }),
  );
  const raw = await got.Body!.transformToString();
  const headers = parseHeaders(raw);
  const sender = asBareAddress(headers['reply-to'] ?? headers.from ?? '');
  if (!sender) throw new Error(`no From/Reply-To in s3://${BUCKET}/${newest.Key}`);
  const subject = headers.subject ?? '';
  const messageId = headers['message-id'] ?? '';

  // 3. pick a critter at random — the proof the responder chose, not echoed
  const critter = CRITTERS[Math.floor(Math.random() * CRITTERS.length)]!;

  // 4. build the raw reply (threaded via In-Reply-To/References when the sender gave a Message-ID)
  const bodyText = [
    `${critter.emoji} ${critter.line}`,
    ``,
    `you emailed ${FROM} and it echoed back — both legs of the mail stack work:`,
    `  inbound  : your message landed at s3://${BUCKET}/${newest.Key}`,
    `  outbound : this reply left via ses SendEmail from the verified domain`,
    ``,
    `today's responder: the ${critter.name} ${critter.emoji}`,
  ].join('\n');
  const mime = [
    `From: ${FROM}`,
    `To: ${sender}`,
    `Subject: ${asReplySubject(subject)}`,
    ...(messageId
      ? [`In-Reply-To: ${messageId}`, `References: ${messageId}`]
      : []),
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    bodyText,
  ].join('\n');

  // 5. send the reply
  try {
    const sent = await ses.send(
      new SendEmailCommand({
        FromEmailAddress: FROM,
        Destination: { ToAddresses: [sender] },
        Content: { Raw: { Data: Buffer.from(mime, 'utf-8') } },
      }),
    );
    console.log(
      `🐢 echoed! the ${critter.name} ${critter.emoji} replied to ${sender}\n` +
        `   in-reply-to : ${newest.Key}\n` +
        `   messageId   : ${sent.MessageId}`,
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'MessageRejected') {
      throw new Error(
        `SES rejected the reply to ${sender} — in sandbox, the recipient must be a VERIFIED ` +
          `identity. verify ${sender} in SES (or request production access), then re-run. ` +
          `cause: ${error.message}`,
      );
    }
    throw error;
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
