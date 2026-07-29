import { given, then, when } from 'test-fns';

import { isEc2SshKeyAuthorizedStale } from './isEc2SshKeyAuthorizedStale';

/**
 * .what = unit cases for the stale-authorization decision
 * .why = this pure compare is the CORE of the rebuild fix — a mismatch between the
 *        recorded and live instance ref means the box was replaced and the on-disk key
 *        was wiped, so the tracked param must read as absent → CREATE
 */
const TEST_CASES = [
  {
    description: 'same box (refs match) → not stale (KEEP)',
    given: { recorded: { id: 'i-aaa' }, live: { id: 'i-aaa' } },
    expect: false,
  },
  {
    description:
      'box rebuilt (refs differ) → stale (CREATE) — the headline fix',
    given: { recorded: { id: 'i-aaa' }, live: { id: 'i-bbb' } },
    expect: true,
  },
  {
    description: 'no live box (terminated, not recreated) → stale (CREATE)',
    given: { recorded: { id: 'i-aaa' }, live: null },
    expect: true,
  },
  {
    description:
      'legacy param (no recorded instance) → stale (one-time re-push upgrade)',
    given: { recorded: null, live: { id: 'i-aaa' } },
    expect: true,
  },
  {
    description: 'legacy param AND no live box → stale',
    given: { recorded: null, live: null },
    expect: true,
  },
] as const;

describe('isEc2SshKeyAuthorizedStale', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      when('the staleness of the tracked authorization is evaluated', () => {
        then(`it returns ${thisCase.expect}`, () => {
          const output = isEc2SshKeyAuthorizedStale({
            recorded: thisCase.given.recorded,
            live: thisCase.given.live,
          });
          expect(output).toEqual(thisCase.expect);
        });
      });
    }),
  );
});
