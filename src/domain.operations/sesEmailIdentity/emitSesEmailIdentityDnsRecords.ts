import type { ContextLogTrail } from 'sdk-logs';

import type { DeclaredAwsSesEmailIdentity } from '@src/domain.objects/DeclaredAwsSesEmailIdentity';

import { asSesEmailIdentityDnsRecords } from './asSesEmailIdentityDnsRecords';

/**
 * .what = logs the copy-paste dns records a domain identity owes (a no-op for an email
 *   identity, or when no records are due)
 * .why = the vision's "aha" — apply surfaces the ONE step declastruct cannot do (dns lives in
 *   a different provider). emitted on BOTH the create/upsert path AND the findsert-KEEP path,
 *   so a human who lost the first-run output re-surfaces the records by a plain re-apply — KEEP
 *   is otherwise the only path a re-run takes, and it must not swallow the records the vision
 *   promises to hand over
 * .note = logged at .warn, not .info — sdk-logs reserves .warn for "someone must look at this
 *   asap", and without these records the domain never verifies and mail never flows. .info can
 *   be filtered below the operator's threshold; the vision's core hand-off must not be
 *   filterable away. mirrors the repo's degrade-and-tell-the-human precedent (the cost-report
 *   opt-in-off warns)
 */
export const emitSesEmailIdentityDnsRecords = (
  input: { identity: DeclaredAwsSesEmailIdentity; region: string },
  context: ContextLogTrail,
): void => {
  // a verified identity owes no records — dns has already propagated, so stay quiet. this
  // keeps .warn a MUST-SEE signal: a perpetual re-log on every apply after verification would
  // train operators to ignore it, which defeats the whole reason the vision reserves .warn for
  // the one-time dns hand-off (rule.forbid.friction-hazards)
  if (input.identity.verificationStatus === 'verified') return;

  const dnsRecords = asSesEmailIdentityDnsRecords({
    identity: input.identity,
    region: input.region,
  });

  // an email identity (or a records-free case) owes none — stay quiet
  if (!dnsRecords.length) return;

  context.log.warn(
    `SES identity "${input.identity.identity}" — paste these dns records into your dns provider to complete verification`,
    { dnsRecords },
  );
};
