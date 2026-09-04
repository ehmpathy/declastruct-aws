import { BadRequestError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { assertExactlyOnePresent } from './assertExactlyOnePresent';

/**
 * .what = unit coverage for the "exactly one of N present" invariant guard
 * .why = several domain unions rely on this to fail loud when 0 or 2+ fields are set, so a
 *   malformed value never reaches AWS as a raw error (rule.require.failfast)
 */
describe('assertExactlyOnePresent', () => {
  given('exactly one key is non-null', () => {
    when('asserted', () => {
      then('it is a no-op (does not throw)', () => {
        expect(() =>
          assertExactlyOnePresent({
            of: { a: 'x', b: null, c: null },
            keys: ['a', 'b', 'c'],
            label: 'a widget',
          }),
        ).not.toThrow();
      });
    });
  });

  given('zero keys are non-null', () => {
    when('asserted', () => {
      then('it fails loud with a BadRequestError', () => {
        const error = getError(() =>
          assertExactlyOnePresent({
            of: { a: null, b: null },
            keys: ['a', 'b'],
            label: 'a widget',
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('exactly one');
        expect(error.message).toContain('0 are set');
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('two keys are non-null', () => {
    when('asserted', () => {
      then('it fails loud with a BadRequestError', () => {
        const error = getError(() =>
          assertExactlyOnePresent({
            of: { a: 'x', b: 'y' },
            keys: ['a', 'b'],
            label: 'a widget',
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('2 are set');
        expect(error.message).toMatchSnapshot();
      });
    });
  });
});
