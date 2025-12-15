import { given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import { getAllIamUsers } from './getAllIamUsers';
import { getOneIamUser } from './getOneIamUser';

/**
 * .what = integration tests for getOneIamUser
 * .why = validates IAM user lookup works against real AWS API
 */
describe('getOneIamUser', () => {
  const context = useBeforeAll(() => getSampleAwsApiContext());

  given('an existing IAM user', () => {
    const scene = useBeforeAll(async () => {
      // get first user from account to use for testing
      const users = await getAllIamUsers(
        { by: { account: { id: context.aws.credentials.account } } },
        context,
      );
      if (users.length === 0)
        return { user: null as (typeof users)[0] | null, hasUsers: false };
      return { user: users[0]!, hasUsers: true };
    });

    when('looking up by unique (account + username)', () => {
      then('it should return the user', async () => {
        if (!scene.hasUsers) {
          console.log('skipping test - no users in account');
          return;
        }

        const user = await getOneIamUser(
          {
            by: {
              unique: {
                account: scene.user!.account,
                username: scene.user!.username,
              },
            },
          },
          context,
        );

        expect(user).not.toBeNull();
        expect(user?.username).toBe(scene.user!.username);
        expect(user?.id).toBe(scene.user!.id);
        console.log('found user:', user);
      });
    });

    when('looking up by ref', () => {
      then('it should return the user', async () => {
        if (!scene.hasUsers) {
          console.log('skipping test - no users in account');
          return;
        }

        const user = await getOneIamUser(
          {
            by: {
              ref: {
                account: scene.user!.account,
                username: scene.user!.username,
              },
            },
          },
          context,
        );

        expect(user).not.toBeNull();
        expect(user?.username).toBe(scene.user!.username);
      });
    });
  });

  given('a non-existent user', () => {
    when('looking up by unique', () => {
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
