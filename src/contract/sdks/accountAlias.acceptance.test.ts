import { getError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';

import { delAccountAlias, getOneAccountAlias, setAccountAlias } from './index';

/**
 * .what = acceptance tests for account alias SDK exports
 * .why = validates end-to-end usage of account alias operations via public SDK
 *
 * .note
 *   - requires IAM permissions: iam:CreateAccountAlias, iam:DeleteAccountAlias, iam:ListAccountAliases
 *   - write tests (setAccountAlias) require iam:CreateAccountAlias permission
 *   - validation tests (case3) work because they fail before AWS call
 *
 * .coverage-strategy
 *   - positive paths: snapped in case1, case2 (lifecycle, rebrand)
 *   - validation errors: snapped in case3 (BadRequestError)
 *   - AWS errors (AccessDenied, LimitExceeded, ServiceException, network):
 *     - cannot trigger without fault injection or broken IAM setup
 *     - error transformation is unit tested with snapshots in:
 *       src/domain.operations/accountAlias/asAccountAliasErrorFromAwsError.test.ts
 *     - all AWS error types are snapped there (5 cases)
 *   - partition collision (EntityAlreadyExistsException):
 *     - requires another account to own the alias
 *     - error transformation is unit tested with snapshot in:
 *       asAccountAliasErrorFromAwsError.test.ts (EntityAlreadyExistsException case)
 */
describe('accountAlias acceptance', () => {
  const context = useBeforeAll(() => getSampleAwsApiContext());

  // cleanup before and after all tests
  beforeAll(async () => {
    await delAccountAlias({ by: { auth: true } }, context);
  });
  afterAll(async () => {
    await delAccountAlias({ by: { auth: true } }, context);
  });

  given('[case1] complete lifecycle', () => {
    // ensure clean state
    beforeAll(async () => {
      await delAccountAlias({ by: { auth: true } }, context);
    });
    afterAll(async () => {
      await delAccountAlias({ by: { auth: true } }, context);
    });

    when('[t0] getOneAccountAlias is called before any changes', () => {
      then('it returns null', async () => {
        const result = await getOneAccountAlias(
          { by: { auth: true } },
          context,
        );
        expect(result).toBeNull();
        expect(result).toMatchSnapshot();
      });
    });

    when('[t1] setAccountAlias is called to create', () => {
      then('it returns the created alias', async () => {
        const result = await setAccountAlias(
          { upsert: { alias: 'declastruct-acceptance-test' } },
          context,
        );
        expect(result.alias).toEqual('declastruct-acceptance-test');
        expect(result).toMatchSnapshot({
          alias: expect.any(String),
        });
      });
    });

    when('[t2] getOneAccountAlias is called after create', () => {
      then('it returns the alias', async () => {
        const result = await getOneAccountAlias(
          { by: { auth: true } },
          context,
        );
        expect(result?.alias).toEqual('declastruct-acceptance-test');
        expect(result).toMatchSnapshot({
          alias: expect.any(String),
        });
      });
    });

    when('[t3] setAccountAlias is called with same alias (idempotent)', () => {
      then('it returns the same alias', async () => {
        const result = await setAccountAlias(
          { upsert: { alias: 'declastruct-acceptance-test' } },
          context,
        );
        expect(result.alias).toEqual('declastruct-acceptance-test');
        expect(result).toMatchSnapshot({
          alias: expect.any(String),
        });
      });
    });

    when('[t4] delAccountAlias is called', () => {
      then('it returns deleted: true', async () => {
        const result = await delAccountAlias({ by: { auth: true } }, context);
        expect(result).toEqual({ deleted: true });
        expect(result).toMatchSnapshot();
      });
    });

    when('[t5] getOneAccountAlias is called after delete', () => {
      then('it returns null', async () => {
        const result = await getOneAccountAlias(
          { by: { auth: true } },
          context,
        );
        expect(result).toBeNull();
        expect(result).toMatchSnapshot();
      });
    });

    when('[t6] delAccountAlias is called again (idempotent)', () => {
      then('it returns deleted: true', async () => {
        const result = await delAccountAlias({ by: { auth: true } }, context);
        expect(result).toEqual({ deleted: true });
        expect(result).toMatchSnapshot();
      });
    });
  });

  given('[case2] alias rebrand', () => {
    // setup with old alias
    beforeAll(async () => {
      await delAccountAlias({ by: { auth: true } }, context);
      await setAccountAlias(
        { upsert: { alias: 'declastruct-accept-old' } },
        context,
      );
    });
    afterAll(async () => {
      await delAccountAlias({ by: { auth: true } }, context);
    });

    when('[t0] setAccountAlias is called with new alias', () => {
      then('it returns the new alias', async () => {
        const result = await setAccountAlias(
          { upsert: { alias: 'declastruct-accept-new' } },
          context,
        );
        expect(result.alias).toEqual('declastruct-accept-new');
        expect(result).toMatchSnapshot({
          alias: expect.any(String),
        });
      });
    });

    when('[t1] getOneAccountAlias is called after rebrand', () => {
      then('it returns the new alias', async () => {
        const result = await getOneAccountAlias(
          { by: { auth: true } },
          context,
        );
        expect(result?.alias).toEqual('declastruct-accept-new');
        expect(result).toMatchSnapshot({
          alias: expect.any(String),
        });
      });
    });
  });

  given('[case3] validation error', () => {
    when('[t0] setAccountAlias is called with invalid alias', () => {
      then('it throws BadRequestError with format details', async () => {
        const error = await getError(
          setAccountAlias({ upsert: { alias: 'INVALID_UPPERCASE' } }, context),
        );
        expect(error.message).toContain('invalid account alias format');
        expect(error.message).toMatchSnapshot();
      });
    });
  });
});
