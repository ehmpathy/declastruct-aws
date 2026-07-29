import { UnexpectedCodePathError } from 'helpful-errors';

/**
 * .what = asserts the ssm command that appended the ssh key reported success
 * .why = the append runs over ssm, which needs the box active + its agent reachable;
 *        a non-Success status means the key did NOT durably land, so we must fail loud
 *        (never record a track-param for a key that was not written). the message names
 *        the likely cause + the fix so the operator can recover.
 * .note
 *   - extracted from setEc2SshKeyAuthorized as a pure guard so this error path is
 *     unit-testable without live infra (a stopped/unreachable box is otherwise only
 *     reachable in a real-infra run) — this clamps the throw against a silent-swallow
 *     regression.
 */
export const assertSshKeyPushSucceeded = (input: {
  authorization: {
    status: 'Success' | 'Failed' | 'TimedOut' | 'Cancelled';
    stderr: string;
  };
  instance: { id?: string; exid?: string };
}): void => {
  // the happy path — the key landed on the box's disk
  if (input.authorization.status === 'Success') return;

  // otherwise the append did not land — fail loud, and name the recovery
  UnexpectedCodePathError.throw(
    'ssm command did not report success when it appended the ssh key; the box may be' +
      ' stopped or its ssm agent unreachable — ensure the instance session is active' +
      ' (declare it before the ssh-key resource) before you authorize a key',
    {
      instance: input.instance,
      status: input.authorization.status,
      stderr: input.authorization.stderr,
    },
  );
};
