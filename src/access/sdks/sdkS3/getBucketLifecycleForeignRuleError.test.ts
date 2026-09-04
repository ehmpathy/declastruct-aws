import { BadRequestError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { getBucketLifecycleForeignRuleError } from './getBucketLifecycleForeignRuleError';

/**
 * .what = unit coverage for the foreign-lifecycle-rule fail-loud error builder
 * .why = the message is user-shown guidance a human acts on to unblock a stuck apply; a
 *   snapshot pins the exact text so a future edit that drops the fix steps is caught
 *   (rule.forbid.silent-resource-theft surfaced this guard; the region + active-set guards
 *   snap their messages the same way)
 */
describe('getBucketLifecycleForeignRuleError', () => {
  given('a bucket that holds one foreign lifecycle rule', () => {
    when('the error is built', () => {
      const error = getBucketLifecycleForeignRuleError({
        name: 'ehmpathy-mail-inbound-demo',
        foreignRuleIds: ['some-console-rule'],
      });

      then('it is a BadRequestError', () => {
        expect(error).toBeInstanceOf(BadRequestError);
      });

      then('it names the bucket and the foreign rule id', () => {
        expect(error.message).toContain('ehmpathy-mail-inbound-demo');
        expect(error.message).toContain('some-console-rule');
      });

      then('it carries the actionable fix guidance (message snapshot)', () => {
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('a bucket that holds several foreign rules', () => {
    when('the error is built', () => {
      const error = getBucketLifecycleForeignRuleError({
        name: 'ehmpathy-mail-inbound-demo',
        foreignRuleIds: ['rule-a', '(unnamed)'],
      });

      then('it lists every foreign rule id (message snapshot)', () => {
        expect(error.message).toContain('rule-a');
        expect(error.message).toContain('(unnamed)');
        expect(error.message).toMatchSnapshot();
      });
    });
  });
});
