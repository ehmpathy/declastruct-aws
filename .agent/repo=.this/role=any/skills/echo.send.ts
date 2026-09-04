/* eslint-disable no-console */
/**
 * .what = the echo mailbox INITIATOR — sends a fresh (non-reply) email from the verified
 *   domain to a chosen recipient, with a random 🐢/🦫/🦉 hello
 * .why = the outbound-only companion to echo.reply: echo.reply proves the round-trip (inbound
 *   -> outbound), this proves the outbound leg ALONE — a real SendEmail from the verified
 *   domain to a recipient, no prior inbound message needed. a downstream CONSUMER of the
 *   declared primitives, NOT a declared resource, so it lives as a skill.
 * .note = LIVE — sends a real email. SES SANDBOX delivers only to VERIFIED recipients, so the
 *   message reaches the recipient only once that address is verified (or the account has
 *   production access). a MessageRejected on an unverified recipient is expected in sandbox and
 *   is surfaced with that exact hint.
 */
import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';

import { getAwsClientConfig } from '../../../../src/access/sdks/getAwsClientConfig';
import { getCredentials } from '../../../../src/contract/sdks';

// defaults match provision/aws.infra/account=demo/resources.mail.ts; override via env
const FROM = process.env.ECHO_FROM ?? 'echo@demo.ehmpathy.com';
const TO = process.env.ECHO_TO ?? 'vlad@ahbode.com';
const SUBJECT = process.env.ECHO_SUBJECT ?? 'hello from the echo mailbox 🐢';

// the three org mascots — the random pick that proves the initiator chose, not echoed
const CRITTERS = [
  {
    emoji: '🐢',
    name: 'seaturtle',
    line: 'slow and steady — this note drifted out of the echo mailbox and rode the current to you.',
  },
  {
    emoji: '🦫',
    name: 'beaver',
    line: 'the echo mailbox built a dam, and this fresh note flowed downstream to your inbox.',
  },
  {
    emoji: '🦉',
    name: 'owl',
    line: 'whoo goes there? the echo mailbox hooted a fresh hello your way.',
  },
] as const;

const main = async (): Promise<void> => {
  const { region } = await getCredentials();
  const ses = new SESv2Client(getAwsClientConfig({ region }));

  // pick a critter at random — the proof the initiator chose
  const critter = CRITTERS[Math.floor(Math.random() * CRITTERS.length)]!;

  // build the raw fresh message (a new thread — no In-Reply-To/References)
  const bodyText = [
    `${critter.emoji} ${critter.line}`,
    ``,
    `this is a FRESH email from ${FROM} — it proves the outbound leg alone:`,
    `  outbound : this message left via ses SendEmail from the verified domain`,
    ``,
    `reply to it and it lands in s3 via the receipt rule; run \`rhx echo.reply\` to hear back.`,
    ``,
    `today's sender: the ${critter.name} ${critter.emoji}`,
  ].join('\n');
  const mime = [
    `From: ${FROM}`,
    `To: ${TO}`,
    `Subject: ${SUBJECT}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    bodyText,
  ].join('\n');

  // send the fresh email
  try {
    const sent = await ses.send(
      new SendEmailCommand({
        FromEmailAddress: FROM,
        Destination: { ToAddresses: [TO] },
        Content: { Raw: { Data: Buffer.from(mime, 'utf-8') } },
      }),
    );
    console.log(
      `🐢 sent! the ${critter.name} ${critter.emoji} emailed ${TO}\n` +
        `   from        : ${FROM}\n` +
        `   subject     : ${SUBJECT}\n` +
        `   messageId   : ${sent.MessageId}`,
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'MessageRejected') {
      throw new Error(
        `SES rejected the send to ${TO} — in sandbox, the recipient must be a VERIFIED ` +
          `identity. verify ${TO} in SES (or request production access), then re-run. ` +
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
