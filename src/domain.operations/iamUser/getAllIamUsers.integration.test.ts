import { given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import { getAllIamUsers } from './getAllIamUsers';

/**
 * .what = integration tests for getAllIamUsers
 * .why = validates IAM user listing works against real AWS API
 */
describe('getAllIamUsers', () => {
  const context = useBeforeAll(() => getSampleAwsApiContext());

  given('an AWS account', () => {
    when('listing all IAM users', () => {
      then('it should return an array of users', async () => {
        const users = await getAllIamUsers(
          { by: { account: { id: context.aws.credentials.account } } },
          context,
        );

        // every account has at least one user (the root user or service accounts)
        expect(Array.isArray(users)).toBe(true);
        console.log(`found ${users.length} IAM users`);

        // if there are users, verify structure
        if (users.length > 0) {
          const firstUser = users[0];
          expect(firstUser).toHaveProperty('id');
          expect(firstUser).toHaveProperty('arn');
          expect(firstUser).toHaveProperty('username');
          expect(firstUser).toHaveProperty('account');
          expect(firstUser).toHaveProperty('createDate');
          console.log('sample user:', firstUser);
        }
      });
    });
  });
});
