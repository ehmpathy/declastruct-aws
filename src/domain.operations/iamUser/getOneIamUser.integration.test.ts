import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import {
  delTestIamUserThrowaway,
  setTestIamUserThrowaway,
  TEST_IAM_USER_PREFIX,
} from '@src/.test/setTestIamUserThrowaway';

import { getOneIamUser } from './getOneIamUser';

/**
 * .what = integration tests for getOneIamUser
 * .why = validates IAM user lookup works against real AWS API
 * .note = the test mints its own throwaway user — the demo account holds none, and a lookup
 *   test with no subject proves no behavior. both-ends cleanup; the name carries a fresh uuid
 */
describe('getOneIamUser', () => {
  const testUserName = `${TEST_IAM_USER_PREFIX}user-${genTestUuid().slice(0, 8)}`;
  const context = useBeforeAll(() => getSampleAwsApiContext());

  afterAll(async () => {
    // fresh context so teardown runs even if setup failed
    const teardownContext = await getSampleAwsApiContext();
    await delTestIamUserThrowaway({ name: testUserName }, teardownContext);
  });

  given('an extant IAM user', () => {
    const scene = useBeforeAll(async () => {
      await delTestIamUserThrowaway({ name: testUserName }, context);
      return setTestIamUserThrowaway(
        { name: testUserName, withAccessKey: false },
        context,
      );
    });

    when('a lookup by unique (account + username)', () => {
      then('it should return the user', async () => {
        const user = await getOneIamUser(
          {
            by: {
              unique: {
                account: { id: context.aws.credentials.account },
                username: testUserName,
              },
            },
          },
          context,
        );

        expect(user).not.toBeNull();
        expect(user?.username).toBe(testUserName);
        // the id matches aws's own, from the create — the pre-fixture test checked the id against
        // the account list; this keeps that cross-source equality
        expect(user?.id).toBe(scene.userId);
      });
    });

    when('a lookup by ref', () => {
      then('it should return the user', async () => {
        const user = await getOneIamUser(
          {
            by: {
              ref: {
                account: { id: context.aws.credentials.account },
                username: testUserName,
              },
            },
          },
          context,
        );

        expect(user).not.toBeNull();
        expect(user?.username).toBe(testUserName);
      });
    });
  });

  given('a non-existent user', () => {
    when('a lookup by unique', () => {
      then('it should return null', async () => {
        const user = await getOneIamUser(
          {
            by: {
              unique: {
                account: { id: context.aws.credentials.account },
                username: 'declastruct-nonexistent-user-12345',
              },
            },
          },
          context,
        );

        expect(user).toBeNull();
      });
    });
  });
});
