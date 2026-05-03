import { BadRequestError, getError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';

import { delAccountAlias } from './delAccountAlias';
import { getOneAccountAlias } from './getOneAccountAlias';
import { setAccountAlias } from './setAccountAlias';

/**
 * .what = integration tests for setAccountAlias
 * .why = validates account alias create/update works against real AWS API
 *
 * .note
 *   - requires IAM permissions: iam:CreateAccountAlias, iam:DeleteAccountAlias, iam:ListAccountAliases
 *   - write tests (setAccountAlias) require iam:CreateAccountAlias permission
 *   - validation tests (case3) work because they fail before AWS call
 *
 * .coverage-strategy
 *   - positive paths: snapped in case1, case2 (create, idempotent, rebrand)
 *   - validation errors: snapped in case3 (BadRequestError)
 *   - AWS errors (AccessDenied, LimitExceeded, ServiceException, network):
 *     - cannot trigger without fault injection or broken IAM setup
 *     - error transformation is unit tested with snapshots in:
 *       asAccountAliasErrorFromAwsError.test.ts (5 error cases snapped)
 */

describe('setAccountAlias', () => {
  const context = useBeforeAll(() => getSampleAwsApiContext());

  // cleanup before and after all tests
  beforeAll(async () => {
    await delAccountAlias({ by: { auth: true } }, context);
  });
  afterAll(async () => {
    await delAccountAlias({ by: { auth: true } }, context);
  });

  given('[case1] no alias present', () => {
    // ensure clean state for this case
    beforeAll(async () => {
      await delAccountAlias({ by: { auth: true } }, context);
    });
    afterAll(async () => {
      await delAccountAlias({ by: { auth: true } }, context);
    });

    when('[t0] setAccountAlias is called to create', () => {
      then('it should return the created alias', async () => {
        const result = await setAccountAlias(
          { upsert: { alias: 'declastruct-test-alias' } },
          context,
        );
        expect(result.alias).toEqual('declastruct-test-alias');
        expect(result).toMatchSnapshot();
      });
    });

    when('[t1] getOneAccountAlias is called after create', () => {
      then('it should return the alias', async () => {
        const result = await getOneAccountAlias(
          { by: { auth: true } },
          context,
        );
        expect(result?.alias).toEqual('declastruct-test-alias');
        expect(result).toMatchSnapshot();
      });
    });

    when('[t2] setAccountAlias is called with same alias', () => {
      then('it should return the same alias (idempotent)', async () => {
        const result = await setAccountAlias(
          { upsert: { alias: 'declastruct-test-alias' } },
          context,
        );
        expect(result.alias).toEqual('declastruct-test-alias');
        expect(result).toMatchSnapshot();
      });
    });
  });

  given('[case2] alias rebrand', () => {
    // setup with old alias
    beforeAll(async () => {
      await delAccountAlias({ by: { auth: true } }, context);
      await setAccountAlias(
        { upsert: { alias: 'declastruct-test-old' } },
        context,
      );
    });
    afterAll(async () => {
      await delAccountAlias({ by: { auth: true } }, context);
    });

    when('[t0] setAccountAlias is called with different alias', () => {
      then('it should return the new alias', async () => {
        const result = await setAccountAlias(
          { upsert: { alias: 'declastruct-test-new' } },
          context,
        );
        expect(result.alias).toEqual('declastruct-test-new');
        expect(result).toMatchSnapshot();
      });
    });

    when('[t1] getOneAccountAlias is called after rebrand', () => {
      then('it should return the new alias', async () => {
        const result = await getOneAccountAlias(
          { by: { auth: true } },
          context,
        );
        expect(result?.alias).toEqual('declastruct-test-new');
        expect(result).toMatchSnapshot();
      });
    });
  });

  given('[case3] invalid alias format', () => {
    when('[t0] setAccountAlias is called with uppercase alias', () => {
      then('it should throw BadRequestError', async () => {
        const error = await getError(
          setAccountAlias({ upsert: { alias: 'UPPERCASE' } }, context),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('invalid account alias format');
        expect({ message: error.message, name: error.name }).toMatchSnapshot();
      });
    });
  });
});
