import { genLogMethods } from 'sdk-logs';

import { DeclaredAwsSesEmailIdentity } from '@src/domain.objects/DeclaredAwsSesEmailIdentity';

import { emitSesEmailIdentityInboxVerification } from './emitSesEmailIdentityInboxVerification';

/**
 * .what = unit coverage for the EMAIL-identity inbox-verification hand-off (the twin of the
 *   dns-records emit, for the OTHER manual step declastruct cannot do)
 * .why = an email identity verifies via an inbox click (AWS emails a confirm link), so an
 *   UNVERIFIED email identity must warn the human — while a domain identity (dns path) and an
 *   already-verified address stay silent. a captured fake log via DI keeps this a pure unit
 */
describe('emitSesEmailIdentityInboxVerification', () => {
  const genLogCapture = () => {
    const warns: { message: string; meta: unknown }[] = [];
    const log = {
      ...genLogMethods(),
      warn: (message: string, meta?: unknown): void => {
        warns.push({ message, meta });
      },
    };
    return { warns, context: { log } };
  };

  test('an unverified email identity warns the inbox-click hand-off', () => {
    const { warns, context } = genLogCapture();
    emitSesEmailIdentityInboxVerification(
      {
        identity: DeclaredAwsSesEmailIdentity.as({
          identity: 'robot@demo.ehmpathy.com',
          dkim: 'disabled',
          mailFrom: null,
          tags: null,
          dkimTokens: [],
          verificationStatus: 'unresolved',
        }),
      },
      context,
    );
    expect(warns).toHaveLength(1);
    expect(warns[0]?.message).toContain('robot@demo.ehmpathy.com');
    expect(warns[0]?.message).toContain('click');
    // snap the exact hand-off message — symmetric with the dns-records twin, so a reword or
    // shape change to this human-must-act artifact is caught in review, not shipped silently
    expect(warns[0]?.message).toMatchSnapshot();
  });

  test('a verified email identity emits no log (already confirmed)', () => {
    const { warns, context } = genLogCapture();
    emitSesEmailIdentityInboxVerification(
      {
        identity: DeclaredAwsSesEmailIdentity.as({
          identity: 'robot@demo.ehmpathy.com',
          dkim: 'disabled',
          mailFrom: null,
          tags: null,
          dkimTokens: [],
          verificationStatus: 'verified',
        }),
      },
      context,
    );
    expect(warns).toHaveLength(0);
  });

  test('a domain identity emits no log (it verifies via dns, not an inbox click)', () => {
    const { warns, context } = genLogCapture();
    emitSesEmailIdentityInboxVerification(
      {
        identity: DeclaredAwsSesEmailIdentity.as({
          identity: 'demo.ehmpathy.com',
          dkim: 'enabled',
          mailFrom: null,
          tags: null,
          dkimTokens: ['t1', 't2', 't3'],
          verificationStatus: 'unresolved',
        }),
      },
      context,
    );
    expect(warns).toHaveLength(0);
  });
});
