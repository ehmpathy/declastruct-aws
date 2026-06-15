import type { Hash } from 'hash-fns';
import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asHashFromBase64 } from './asHashFromBase64';

describe('asHashFromBase64', () => {
  given('a valid base64-encoded sha256 hash', () => {
    // sha256('test') = 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
    // in base64: n4bQgYhMfWWaL+qgxVrQFaO/TxsrC4Is0V1sFbDwCgg=
    const base64Hash = 'n4bQgYhMfWWaL+qgxVrQFaO/TxsrC4Is0V1sFbDwCgg=';
    const expectedHex =
      '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';

    when('converted to hex', () => {
      then('returns correct hex hash', () => {
        const result = asHashFromBase64(base64Hash);
        expect(result).toBe(expectedHex);
      });

      then('result is typed as Hash', () => {
        const result: Hash = asHashFromBase64(base64Hash);
        expect(typeof result).toBe('string');
        expect(result.length).toBe(64); // sha256 hex = 64 chars
      });
    });
  });

  given('AWS CodeSha256 format (real-world example)', () => {
    // this is what AWS lambda returns for CodeSha256
    const awsCodeSha256 = 'LCa0a2j/xo/5m0U8HTBBNBNCLXBkg7+g+YpeiGJm564=';
    const expectedHex =
      '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae';

    when('converted to hex', () => {
      then('returns valid 64-char hex hash', () => {
        const result = asHashFromBase64(awsCodeSha256);
        expect(result).toBe(expectedHex);
        expect(result.length).toBe(64);
      });
    });
  });

  given('an invalid base64 string (too short to be sha256)', () => {
    const invalidBase64 = 'abc123'; // not a valid sha256

    when('converted', () => {
      then('throws assure rejection', async () => {
        const error = await getError(() => asHashFromBase64(invalidBase64));
        expect(error.message).toContain('assure.rejection');
      });
    });
  });
});
