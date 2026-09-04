import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import { DeclaredAwsSesEmailIdentity } from '@src/domain.objects/DeclaredAwsSesEmailIdentity';

import { delSesEmailIdentity } from './delSesEmailIdentity';
import { getOneSesEmailIdentity } from './getOneSesEmailIdentity';
import { setSesEmailIdentity } from './setSesEmailIdentity';

/**
 * .what = journey test for the ses EMAIL-valued identity lifecycle (findsert -> get ->
 *   findsert-again -> del -> del-again) against real SES v2
 * .why = clamps the defect where setSesEmailIdentity unconditionally called
 *   putEmailIdentityDkim + putEmailIdentityMailFrom on EVERY identity. dkim + mail-from are
 *   DOMAIN-level attributes; AWS rejects both on an email-address identity with
 *   `BadRequestException: Domain <x> is not verified for DKIM signing`. so a findsert of an
 *   email identity THREW before the `isEmail` gate landed. this test goes red under the
 *   un-gated code and green under the fix (rule.require.clamp-edge-cases).
 * .note
 *   - the test address MUST live under a domain NOT dkim-verified in this account, or the
 *     defect will not reproduce: an email under an already-verified parent INHERITS its dkim,
 *     so AWS accepts the (buggy) domain-only call and the clamp loses its teeth. example.com
 *     (RFC 2606 reserved) is never verified here AND never routes to a real inbox, so AWS's
 *     verify email hits a guaranteed sink — no spam, no clutter, and the defect reproduces
 *   - an email identity stays `verificationStatus: unresolved` (nobody clicks the link) — that
 *     is the asserted normal state, NOT a failure; the clamp is "created without a throw"
 *   - both-ends cleanup: del before AND after so a crashed run self-heals (del is idempotent)
 */
describe('sesEmailIdentity.journey', () => {
  const testIdentity = `declastruct-clamp-${genTestUuid().slice(0, 8)}@example.com`;

  const testEmail = DeclaredAwsSesEmailIdentity.as({
    identity: testIdentity,
    dkim: 'disabled',
    mailFrom: null,
    tags: { managedBy: 'declastruct', purpose: 'integration-test' },
  });

  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();

    // cleanup before: remove any leftover from a prior crashed run
    await delSesEmailIdentity(
      { by: { unique: { identity: testIdentity } } },
      context,
    );

    return { context };
  });

  afterAll(async () => {
    // cleanup after: fresh context so teardown runs even if scene setup failed
    const context = await getSampleAwsApiContext();
    await delSesEmailIdentity(
      { by: { unique: { identity: testIdentity } } },
      context,
    );
  });

  given(
    '[case1] an email-valued identity (dkim + mail-from must be skipped)',
    () => {
      const createdIdentity = useBeforeAll(async () => {
        const { context } = scene;
        // the clamp: pre-fix this threw BadRequestException on the domain-only dkim call
        return setSesEmailIdentity({ findsert: testEmail }, context);
      });

      when('[t1] findsert an email identity', () => {
        then('it is created without a dkim/mail-from throw', () => {
          expect(createdIdentity.identity).toBe(testIdentity);
        });
      });

      when('[t2] getOne by unique', () => {
        then(
          'returns the identity (unresolved is a normal state)',
          async () => {
            const { context } = scene;
            const found = await getOneSesEmailIdentity(
              { by: { unique: { identity: testIdentity } } },
              context,
            );
            expect(found).not.toBeNull();
            expect(found?.identity).toBe(testIdentity);
          },
        );
      });

      when('[t3] findsert again', () => {
        then('returns the extant identity unchanged (idempotent)', async () => {
          const { context } = scene;
          const again = await setSesEmailIdentity(
            { findsert: testEmail },
            context,
          );
          expect(again.identity).toBe(testIdentity);
        });
      });

      when('[t4] del identity', () => {
        then('the identity is removed and getOne returns null', async () => {
          const { context } = scene;
          await delSesEmailIdentity(
            { by: { unique: { identity: testIdentity } } },
            context,
          );
          const gone = await getOneSesEmailIdentity(
            { by: { unique: { identity: testIdentity } } },
            context,
          );
          expect(gone).toBeNull();
        });
      });

      when('[t5] del again', () => {
        then(
          'is a no-op (idempotent — an absent identity converges)',
          async () => {
            const { context } = scene;
            await expect(
              delSesEmailIdentity(
                { by: { unique: { identity: testIdentity } } },
                context,
              ),
            ).resolves.toBeUndefined();
          },
        );
      });
    },
  );
});
