import { given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';

import { delAccountAlias } from './delAccountAlias';

/**
 * .what = integration tests for delAccountAlias
 * .why = validates account alias deletion works against real AWS API
 *
 * .coverage-strategy
 *   - positive paths: snapped (returns { deleted: true })
 *   - idempotent behavior: snapped (delete twice returns same result)
 *   - AWS errors: cannot trigger without fault injection
 *     - delete is idempotent - no NoSuchEntity error (returns true regardless)
 *     - permission errors would require broken IAM setup
 */
describe('delAccountAlias', () => {
  const context = useBeforeAll(() => getSampleAwsApiContext());

  given('an authenticated AWS account', () => {
    when('delAccountAlias is called', () => {
      then('it should return deleted: true (idempotent)', async () => {
        // note: whether alias is present or not, delAccountAlias returns { deleted: true }
        const result = await delAccountAlias({ by: { auth: true } }, context);

        expect(result).toEqual({ deleted: true });
        expect(result).toMatchSnapshot();
      });
    });

    when('delAccountAlias is called twice', () => {
      then('both calls should return deleted: true', async () => {
        const result1 = await delAccountAlias({ by: { auth: true } }, context);
        const result2 = await delAccountAlias({ by: { auth: true } }, context);

        expect(result1).toEqual({ deleted: true });
        expect(result2).toEqual({ deleted: true });
        expect(result1).toMatchSnapshot();
        expect(result2).toMatchSnapshot();
      });
    });

    // note: "after deletion returns null" is tested in setAccountAlias.integration.test.ts
    // where test isolation is enforced via beforeAll/afterAll cleanup.
    // that test would be flaky here because Jest runs test files in parallel
    // and there's only one account alias slot per AWS account.
  });
});
