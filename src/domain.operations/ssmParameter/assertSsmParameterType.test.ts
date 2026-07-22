import { BadRequestError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { assertSsmParameterType } from './assertSsmParameterType';

describe('assertSsmParameterType', () => {
  given('[case1] the live type matches the expected type', () => {
    when('[t1] a String is asserted as String', () => {
      then('the guard passes (no throw)', () => {
        expect(() =>
          assertSsmParameterType({
            found: { name: '/x', type: 'String' },
            expected: 'String',
          }),
        ).not.toThrow();
      });
    });

    when('[t2] a SecureString is asserted as SecureString', () => {
      then('the guard passes (no throw)', () => {
        expect(() =>
          assertSsmParameterType({
            found: { name: '/x', type: 'SecureString' },
            expected: 'SecureString',
          }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] the live type is a mismatch', () => {
    when('[t1] a SecureString is asserted as String (Plain guard)', () => {
      then('fails loud with the mirror message', () => {
        let message = '';
        try {
          assertSsmParameterType({
            found: { name: '/secret', type: 'SecureString' },
            expected: 'String',
          });
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestError);
          message = (error as BadRequestError).message;
        }
        expect(message).toContain('is a SecureString, not a String');
        expect(message).toContain('use DeclaredAwsSsmParameterSecure');
        expect(message).toContain('StringList is unsupported');
      });
    });

    when('[t2] a String is asserted as SecureString (Secure guard)', () => {
      then('fails loud with the mirror message', () => {
        let message = '';
        try {
          assertSsmParameterType({
            found: { name: '/plain', type: 'String' },
            expected: 'SecureString',
          });
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestError);
          message = (error as BadRequestError).message;
        }
        expect(message).toContain('is a String, not a SecureString');
        expect(message).toContain('use DeclaredAwsSsmParameterPlain');
        expect(message).toContain('StringList is unsupported');
      });
    });

    when('[t3] a StringList is asserted (unsupported)', () => {
      then('always fails loud — StringList is never manageable', () => {
        expect(() =>
          assertSsmParameterType({
            found: { name: '/list', type: 'StringList' },
            expected: 'String',
          }),
        ).toThrow(BadRequestError);
      });
    });
  });
});
