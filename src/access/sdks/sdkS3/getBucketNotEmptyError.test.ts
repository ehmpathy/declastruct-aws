import { BadRequestError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { getBucketNotEmptyError } from './getBucketNotEmptyError';

/**
 * .what = unit coverage for the BucketNotEmpty fail-loud error builder
 * .why = the message is user-shown guidance an operator acts on to clear a versioned bucket that
 *   teardown cannot delete; a snapshot pins the exact text so a future edit that drops the
 *   versions/markers cause, the DeleteObjectVersion grant, or the global-name note is caught
 *   (vision case=7 [t7])
 */
describe('getBucketNotEmptyError', () => {
  given('[case1] a DeleteBucket refused as BucketNotEmpty', () => {
    when('[t0] the error is built', () => {
      const error = getBucketNotEmptyError({
        name: 'ehmpathy-mail-inbound-demo',
        awsMessage: 'The bucket you tried to delete is not empty',
      });

      then('it is a BadRequestError', () => {
        expect(error).toBeInstanceOf(BadRequestError);
      });

      then('it names versions and delete markers as the contents', () => {
        expect(error.message).toContain('VERSIONS');
        expect(error.message).toContain('DELETE MARKERS');
      });

      then('it names the absent grant and the global name', () => {
        expect(error.message).toContain('s3:DeleteObjectVersion');
        expect(error.message).toContain('GLOBAL');
      });

      then('it names the bucket in the fix commands', () => {
        expect(error.message).toContain(
          'list-object-versions --bucket ehmpathy-mail-inbound-demo',
        );
      });

      then('it carries the actionable fix guidance (message snapshot)', () => {
        expect({ message: error.message }).toMatchSnapshot();
      });
    });
  });
});
