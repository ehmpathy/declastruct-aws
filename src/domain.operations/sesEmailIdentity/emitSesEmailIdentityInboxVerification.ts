import type { ContextLogTrail } from 'sdk-logs';

import type { DeclaredAwsSesEmailIdentity } from '@src/domain.objects/DeclaredAwsSesEmailIdentity';

import { isSesEmailIdentityEmail } from './isSesEmailIdentityEmail';

/**
 * .what = logs the copy-paste inbox hand-off an EMAIL identity owes (a no-op for a domain
 *   identity, or once the address is verified)
 * .why = the twin of emitSesEmailIdentityDnsRecords for the OTHER manual step declastruct
 *   cannot do. a domain identity verifies via dns (the human pastes records); an EMAIL identity
 *   verifies via an inbox click — AWS emails a confirmation link to that address and a human
 *   must open the inbox and click it. both are the vision's "aha" (apply surfaces the one step
 *   declastruct cannot perform), so the email path must not be silent while the domain path is
 *   loud — decision #3's "always declared, never a manual verify" surfaces the manual step, it
 *   does not erase it
 * .note = logged at .warn, not .info — mirrors emitSesEmailIdentityDnsRecords: without this
 *   click the address never verifies and (in the sandbox) mail to/from it never flows, so the
 *   hand-off is must-see and must not be filterable below an operator's .info threshold
 */
export const emitSesEmailIdentityInboxVerification = (
  input: { identity: DeclaredAwsSesEmailIdentity },
  context: ContextLogTrail,
): void => {
  // a verified address owes no click — the human already confirmed it. stay quiet so .warn
  // stays a MUST-SEE signal (a perpetual re-log after verification would train operators to
  // ignore it — the same friction hazard the dns emit guards against)
  if (input.identity.verificationStatus === 'verified') return;

  // a domain identity (no `@`) verifies via dns, not an inbox click — emitSesEmailIdentityDnsRecords
  // owns that hand-off, so stay quiet here
  const isEmail = isSesEmailIdentityEmail({ identity: input.identity });
  if (!isEmail) return;

  context.log.warn(
    `SES identity "${input.identity.identity}" — AWS emailed a confirmation link to this address; open that inbox and click the link to complete verification`,
    { address: input.identity.identity },
  );
};
