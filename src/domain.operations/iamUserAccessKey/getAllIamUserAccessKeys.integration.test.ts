import { given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import { getAllIamUsers } from '../iamUser/getAllIamUsers';
import { getAllIamUserAccessKeys } from './getAllIamUserAccessKeys';

/**
 * .what = integration tests for getAllIamUserAccessKeys
 * .why = validates IAM access key listing works against real AWS API
 */
describe('getAllIamUserAccessKeys', () => {
  const context = useBeforeAll(() => getSampleAwsApiContext());

  given('an AWS account', () => {
    when('listing all access keys for the account', () => {
      then('it should return an array of access keys', async () => {
        const keys = await getAllIamUserAccessKeys(
          { by: { account: { id: context.aws.credentials.account } } },
          context,
        );

        expect(Array.isArray(keys)).toBe(true);
        console.log(`found ${keys.length} access keys in account`);

        // if there are keys, verify structure
        if (keys.length > 0) {
          const firstKey = keys[0];
          expect(firstKey).toHaveProperty('accessKeyId');
          expect(firstKey).toHaveProperty('user');
          expect(firstKey).toHaveProperty('status');
          expect(firstKey).toHaveProperty('createDate');
          console.log('sample key:', {
            accessKeyId: firstKey?.accessKeyId,
            user: firstKey?.user,
            status: firstKey?.status,
          });
        }
      });
    });
  });

  given('an IAM user', () => {
    const scene = useBeforeAll(async () => {
      // get first user from account
      const users = await getAllIamUsers(
        { by: { account: { id: context.aws.credentials.account } } },
        context,
      );
      if (users.length === 0)
        return { user: null as (typeof users)[0] | null, hasUsers: false };
      return { user: users[0]!, hasUsers: true };
    });

    when('listing access keys for the user', () => {
      then('it should return an array (possibly empty)', async () => {
        if (!scene.hasUsers) {
          console.log('skipping test - no users in account');
          return;
        }

        const keys = await getAllIamUserAccessKeys(
          {
            by: {
              user: {
                account: scene.user!.account,
                username: scene.user!.username,
              },
            },
          },
          context,
        );

        expect(Array.isArray(keys)).toBe(true);
        console.log(
          `user ${scene.user!.username} has ${keys.length} access keys`,
        );

        // all keys should belong to this user
        for (const key of keys) {
          expect(key.user.username).toBe(scene.user!.username);
        }
      });
    });
  });
});
