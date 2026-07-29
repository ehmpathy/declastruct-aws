import { getError, given, then, when } from 'test-fns';

import { assertSshKeyPushSucceeded } from './assertSshKeyPushSucceeded';

/**
 * .what = unit clamp for the ssh-key push success assertion
 * .why = the stopped/unreachable-box failure is otherwise only reachable in a real-infra
 *        run; this clamps the throw (and its actionable message) so a future silent-swallow
 *        regression is caught in ci
 */
describe('assertSshKeyPushSucceeded', () => {
  given('a push that reported Success', () => {
    when('the success is asserted', () => {
      then('it does not throw', () => {
        expect(() =>
          assertSshKeyPushSucceeded({
            authorization: { status: 'Success', stderr: '' },
            instance: { exid: 'grove-1' },
          }),
        ).not.toThrow();
      });
    });
  });

  const NON_SUCCESS_CASES = ['Failed', 'TimedOut', 'Cancelled'] as const;
  NON_SUCCESS_CASES.map((status) =>
    given(`a push that reported ${status}`, () => {
      when('the success is asserted', () => {
        then('it throws an actionable error that names the fix', async () => {
          const error = await getError(async () =>
            assertSshKeyPushSucceeded({
              authorization: { status, stderr: 'agent not reachable' },
              instance: { exid: 'grove-1' },
            }),
          );
          expect(error).toBeDefined();
          // the message must name the likely cause + the recovery (errors-name-the-fix)
          expect(error.message).toContain('did not report success');
          expect(error.message).toContain('instance session is active');
        });
      });
    }),
  );
});
