import { given, then, when } from 'test-fns';

import { asEc2SshKeyAuthorizedRecordedInstance } from './asEc2SshKeyAuthorizedRecordedInstance';

/**
 * .what = unit cases for the recorded-instance parse (param value → primary ref)
 * .why = the get feeds this recorded instance ref into isEc2SshKeyAuthorizedStale; a
 *        legacy param (written before the id was recorded) must read as null so the
 *        compare treats the box as unverifiable → stale → a one-time re-push upgrades it
 */
const TEST_CASES = [
  {
    description: 'param records an instance-id → returns its primary ref',
    given: {
      paramValue: JSON.stringify({
        publicKey: 'ssh-ed25519 AAAA',
        instanceId: 'i-0abc123',
      }),
    },
    expect: { id: 'i-0abc123' },
  },
  {
    description: 'legacy param (no instanceId field) → null',
    given: {
      paramValue: JSON.stringify({
        publicKey: 'ssh-ed25519 AAAA',
      }),
    },
    expect: null,
  },
  {
    description: 'param with an explicit null instanceId → null',
    given: {
      paramValue: JSON.stringify({
        publicKey: 'ssh-ed25519 AAAA',
        instanceId: null,
      }),
    },
    expect: null,
  },
] as const;

describe('asEc2SshKeyAuthorizedRecordedInstance', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      when('the recorded instance is parsed from the param value', () => {
        then(`it returns ${JSON.stringify(thisCase.expect)}`, () => {
          const output = asEc2SshKeyAuthorizedRecordedInstance({
            paramValue: thisCase.given.paramValue,
          });
          expect(output).toEqual(thisCase.expect);
        });
      });
    }),
  );
});
