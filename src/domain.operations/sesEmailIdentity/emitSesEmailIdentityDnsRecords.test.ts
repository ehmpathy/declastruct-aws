import { genLogMethods } from 'sdk-logs';

import { DeclaredAwsSesEmailIdentity } from '@src/domain.objects/DeclaredAwsSesEmailIdentity';

import { emitSesEmailIdentityDnsRecords } from './emitSesEmailIdentityDnsRecords';

/**
 * .what = unit coverage for the dns-records EMIT (the log side of the vision's "aha")
 * .why = the emit must fire whenever a domain identity owes records, so a human who lost the
 *   first-run output recovers them by a plain re-apply — the findsert-KEEP path calls this too
 *   (r10 blocker). the logged payload is snapped so a reviewer sees the exact records + drift
 *   is caught. a captured fake log via DI keeps this a pure unit (no live AWS, no mock)
 */
describe('emitSesEmailIdentityDnsRecords', () => {
  const genLogCapture = () => {
    const warns: { message: string; meta: unknown }[] = [];
    // a real log with only `warn` overridden to capture — keeps the full LogMethods shape.
    // .warn (not .info) is the asserted level: the dns hand-off is must-see, human-must-act
    const log = {
      ...genLogMethods(),
      warn: (message: string, meta?: unknown): void => {
        warns.push({ message, meta });
      },
    };
    return { warns, context: { log } };
  };

  test('a domain identity warns the dns records (payload snapped)', () => {
    const { warns, context } = genLogCapture();
    emitSesEmailIdentityDnsRecords(
      {
        identity: DeclaredAwsSesEmailIdentity.as({
          identity: 'demo.ehmpathy.com',
          dkim: 'enabled',
          mailFrom: null,
          tags: null,
          dkimTokens: ['t1', 't2', 't3'],
        }),
        region: 'us-east-1',
      },
      context,
    );
    expect(warns).toHaveLength(1);
    expect(warns[0]?.message).toContain('demo.ehmpathy.com');
    expect(warns[0]?.meta).toMatchSnapshot();
  });

  test('an email identity emits no log (owes no dns)', () => {
    const { warns, context } = genLogCapture();
    emitSesEmailIdentityDnsRecords(
      {
        identity: DeclaredAwsSesEmailIdentity.as({
          identity: 'robot@demo.ehmpathy.com',
          dkim: 'disabled',
          mailFrom: null,
          tags: null,
          dkimTokens: [],
        }),
        region: 'us-east-1',
      },
      context,
    );
    expect(warns).toHaveLength(0);
  });

  test('a verified domain identity emits no log (dns already propagated)', () => {
    // regression guard: once a domain verifies, the records are live in dns, so the emit must
    // stay quiet. a perpetual re-log on every apply after verification would train operators to
    // ignore the .warn — a loss of the must-see hand-off the vision reserves .warn for
    const { warns, context } = genLogCapture();
    emitSesEmailIdentityDnsRecords(
      {
        identity: DeclaredAwsSesEmailIdentity.as({
          identity: 'demo.ehmpathy.com',
          dkim: 'enabled',
          mailFrom: null,
          tags: null,
          dkimTokens: ['t1', 't2', 't3'],
          verificationStatus: 'verified',
        }),
        region: 'us-east-1',
      },
      context,
    );
    expect(warns).toHaveLength(0);
  });
});
