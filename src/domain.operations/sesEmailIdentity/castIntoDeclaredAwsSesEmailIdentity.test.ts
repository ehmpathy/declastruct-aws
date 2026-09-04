import { getError } from 'test-fns';

import { castIntoDeclaredAwsSesEmailIdentity } from './castIntoDeclaredAwsSesEmailIdentity';

/**
 * .what = unit coverage for the raw-ses-read -> DeclaredAwsSesEmailIdentity cast
 * .why = the verified-flag -> 'verified' | 'unresolved' collapse is the feature's hinge: a
 *   fresh, pre-dns identity (verified=false) MUST read as 'unresolved' so a first apply is a
 *   normal KEEP, not drift. this pins that collapse + the dkim + nullable passthroughs.
 */
describe('castIntoDeclaredAwsSesEmailIdentity', () => {
  test('a verified domain identity maps to verificationStatus=verified + dkim enabled', () => {
    const identity = castIntoDeclaredAwsSesEmailIdentity({
      identity: 'demo.ehmpathy.com',
      verified: true,
      dkimEnabled: true,
      dkimStatus: 'SUCCESS',
      dkimTokens: ['t1', 't2', 't3'],
      mailFrom: null,
      tags: { managedBy: 'declastruct' },
    });
    expect(identity.verificationStatus).toEqual('verified');
    expect(identity.dkim).toEqual('enabled');
    expect(identity.dkimTokens).toEqual(['t1', 't2', 't3']);
    expect(identity.dkimStatus).toEqual('SUCCESS');
  });

  test('an unverified (pre-dns) identity collapses to verificationStatus=unresolved', () => {
    const identity = castIntoDeclaredAwsSesEmailIdentity({
      identity: 'demo.ehmpathy.com',
      verified: false,
      dkimEnabled: true,
      dkimStatus: 'PENDING',
      dkimTokens: ['t1', 't2', 't3'],
      mailFrom: null,
      tags: null,
    });
    expect(identity.verificationStatus).toEqual('unresolved');
    expect(identity.tags).toEqual(null);
  });

  test('a dkim-disabled email identity maps dkim=disabled with empty tokens', () => {
    const identity = castIntoDeclaredAwsSesEmailIdentity({
      identity: 'robot@demo.ehmpathy.com',
      verified: true,
      dkimEnabled: false,
      dkimStatus: null,
      dkimTokens: [],
      mailFrom: null,
      tags: null,
    });
    expect(identity.dkim).toEqual('disabled');
    expect(identity.dkimTokens).toEqual([]);
    expect(identity.dkimStatus).toEqual(null);
  });

  test('a mailFrom attribute hydrates the nested DeclaredAwsSesMailFrom', () => {
    const identity = castIntoDeclaredAwsSesEmailIdentity({
      identity: 'demo.ehmpathy.com',
      verified: true,
      dkimEnabled: true,
      dkimStatus: 'SUCCESS',
      dkimTokens: ['t1', 't2', 't3'],
      mailFrom: {
        domain: 'mail.demo.ehmpathy.com',
        behaviorOnMxFailure: 'REJECT_MESSAGE',
      },
      tags: null,
    });
    expect(identity.mailFrom?.domain).toEqual('mail.demo.ehmpathy.com');
    expect(identity.mailFrom?.behaviorOnMxFailure).toEqual('REJECT_MESSAGE');
  });

  test('a dkimStatus outside the modeled union fails loud (assure)', () => {
    const error = getError(() =>
      castIntoDeclaredAwsSesEmailIdentity({
        identity: 'demo.ehmpathy.com',
        verified: true,
        dkimEnabled: true,
        dkimStatus: 'WAT_UNMODELED',
        dkimTokens: ['t1', 't2', 't3'],
        mailFrom: null,
        tags: null,
      }),
    );
    expect(error.message).toContain('isSesDkimStatus');
    expect(error.message).toMatchSnapshot();
  });
});
