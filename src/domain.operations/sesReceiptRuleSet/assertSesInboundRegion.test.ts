import { BadRequestError } from 'helpful-errors';
import { getError } from 'test-fns';

import { assertSesInboundRegion } from './assertSesInboundRegion';

/**
 * .what = unit coverage for the user-faced region friction guard
 * .why = a wrong-region apply must fail loud with a caller-actionable message that names the
 *   supported regions (rule.forbid.friction-hazards); the message is snapped so a reviewer
 *   sees the exact user-faced error and drift is caught
 */
describe('assertSesInboundRegion', () => {
  test('a receive-capable region is a no-op (does not throw)', () => {
    expect(() => assertSesInboundRegion({ region: 'us-east-1' })).not.toThrow();
  });

  test('a non-receive region fails loud with a message that states the fix', () => {
    const error = getError(() =>
      assertSesInboundRegion({ region: 'us-west-1' }),
    );
    expect(error).toBeInstanceOf(BadRequestError);
    expect(error.message).toContain('"us-west-1" does not support SES inbound');
    expect(error.message).toContain('pick a receive-capable region');
    expect(error.message).toMatchSnapshot();
  });
});
