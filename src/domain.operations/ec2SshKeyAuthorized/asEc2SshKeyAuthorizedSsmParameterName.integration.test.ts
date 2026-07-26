import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import { sdkSsm } from '@src/access/sdks/sdkSsm';

import { asEc2SshKeyAuthorizedSsmParameterName } from './asEc2SshKeyAuthorizedSsmParameterName';

/**
 * .what = proves the derived SSM param name is ACCEPTED by live SSM for a default
 *   ssh-keygen `user@host` comment — the headline regression (issue #73)
 * .why = the unit test proves the derived name is charset-legal; this proves AWS itself
 *   ACCEPTS it, via a real PutParameter -> GetParameter round-trip. before the fix, the
 *   `@` in the name segment threw ValidationException at PutParameter — this is the live
 *   guard for that exact regression.
 * .note
 *   - runs UNCONDITIONALLY in CI: it needs only the ssm param grant (already in
 *     demoPermissionsPolicy at resource '*', consumed by both the SSO + OIDC roles), NOT
 *     an active instance / EC2 Instance Connect / OIDC re-apply — so unlike the heavyweight
 *     ec2SshKeyAuthorized flow it is not CI-gated
 *   - a uuid-scoped instanceExid isolates the param, so repeat + parallel runs never collide
 *   - both-ends cleanup (delParameter before AND after) so a crashed run self-heals
 */
describe('asEc2SshKeyAuthorizedSsmParameterName.integration', () => {
  // a default ssh-keygen comment — the `@` is the exact char that threw ValidationException
  const comment = 'vlad@grove-laptop';
  const instanceExid = `declastruct-test-ssh-name-${genTestUuid().slice(0, 8)}`;
  const paramName = asEc2SshKeyAuthorizedSsmParameterName({
    instanceExid,
    comment,
  });

  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();

    // cleanup before: remove any leftover from a prior crashed run (del is idempotent)
    await sdkSsm.delParameter({ name: paramName }, context);

    return { context };
  });

  afterAll(async () => {
    // cleanup after: fresh context so teardown runs even if scene setup failed
    const context = await getSampleAwsApiContext();
    await sdkSsm.delParameter({ name: paramName }, context);
  });

  given('[case1] a default `user@host` ssh-keygen comment', () => {
    when('[t0] the derived name is written to live SSM', () => {
      const written = useBeforeAll(async () => {
        const { context } = scene;
        // THE regression guard: before the fix this threw ValidationException (illegal `@`)
        return sdkSsm.setParameter(
          {
            name: paramName,
            value: 'ssh-key-authorization-name-derivation-guard',
            type: 'String',
            description: 'regression guard for the @-in-name fix (issue #73)',
          },
          context,
        );
      });

      then('the write succeeds — AWS accepts the derived name', () => {
        expect(written.version).toBeGreaterThanOrEqual(1);
      });

      then('the derived name carries no `@`', () => {
        expect(paramName).not.toContain('@');
      });

      then(
        'the param reads back at the derived name (get/set agree live)',
        async () => {
          const { context } = scene;
          const read = await sdkSsm.getOneParameter(
            { name: paramName },
            context,
          );
          expect(read).not.toBeNull();
          expect(read?.name).toBe(paramName);
        },
      );
    });
  });
});
