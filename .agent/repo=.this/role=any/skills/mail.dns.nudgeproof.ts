/* eslint-disable no-console */
/**
 * .what = prove whether the dkim off→on nudge actually re-arms SES's verification poll
 * .why = a toggle on an already-enabled identity CAN be a no-op that never resets the FAILED
 *   status clock. this samples the dkim enable-flag + dkimStatus at each step (before, after
 *   off, after on) so we SEE the state move — or SEE that it does not. read + one deliberate
 *   toggle cycle; the end state (dkim on) equals the declared state.
 */
import {
  GetEmailIdentityCommand,
  PutEmailIdentityDkimAttributesCommand,
  SESv2Client,
} from '@aws-sdk/client-sesv2';

import { getAwsClientConfig } from '../../../../src/access/sdks/getAwsClientConfig';
import { getCredentials } from '../../../../src/contract/sdks';

const DOMAIN = process.env.MAIL_DOMAIN ?? 'demo.ehmpathy.com';

const sample = async (ses: SESv2Client, label: string): Promise<void> => {
  const got = await ses.send(
    new GetEmailIdentityCommand({ EmailIdentity: DOMAIN }),
  );
  console.log(
    `   ${label}\n` +
      `      ├─ dkim.enabled : ${got.DkimAttributes?.SigningEnabled}\n` +
      `      ├─ dkim.status  : ${got.DkimAttributes?.Status}\n` +
      `      └─ verified     : ${got.VerifiedForSendingStatus}`,
  );
};

const main = async (): Promise<void> => {
  const { region } = await getCredentials();
  const ses = new SESv2Client(getAwsClientConfig({ region }));

  console.log(`🧪 nudge-proof for ${DOMAIN} (region ${region})\n`);

  await sample(ses, '① before nudge:');

  console.log('\n   ↓ toggle dkim off');
  await ses.send(
    new PutEmailIdentityDkimAttributesCommand({
      EmailIdentity: DOMAIN,
      SigningEnabled: false,
    }),
  );
  await sample(ses, '② after off:');

  console.log('\n   ↓ toggle dkim on');
  await ses.send(
    new PutEmailIdentityDkimAttributesCommand({
      EmailIdentity: DOMAIN,
      SigningEnabled: true,
    }),
  );
  await sample(ses, '③ after on:');

  console.log(
    `\n   verdict: if ② or ③ dkim.status moved OFF "FAILED" (to NOT_STARTED/PENDING),\n` +
      `   the toggle re-armed the poll. if it stayed "FAILED" throughout, the toggle no-op'd\n` +
      `   and a delete+recreate re-verify is needed (which mints NEW tokens — CNAMEs must update).`,
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
