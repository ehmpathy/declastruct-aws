import { given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';

import { getOneAccountAlias } from './getOneAccountAlias';

/**
 * .what = integration tests for getOneAccountAlias
 * .why = validates account alias lookup works against real AWS API
 *
 * .coverage-strategy
 *   - positive paths: snapped (returns alias or null)
 *   - AWS errors: cannot trigger without fault injection
 *     - read-only operation with minimal failure modes
 *     - error wrap pattern consistent with setAccountAlias
 */
describe('getOneAccountAlias', () => {
  const context = useBeforeAll(() => getSampleAwsApiContext());

  given('an authenticated AWS account', () => {
    when('getOneAccountAlias is called', () => {
      then('it should return either an alias or null', async () => {
        const result = await getOneAccountAlias(
          { by: { auth: true } },
          context,
        );

        // result is either null (no alias) or a DeclaredAwsAccountAlias
        if (result === null) {
          expect(result).toBeNull();
          expect(result).toMatchSnapshot();
        } else {
          expect(result.alias).toBeDefined();
          expect(typeof result.alias).toBe('string');
          expect(result.alias.length).toBeGreaterThanOrEqual(3);
          expect(result.alias.length).toBeLessThanOrEqual(63);
          expect(result).toMatchSnapshot({
            alias: expect.any(String),
          });
        }
      });
    });
  });
});
