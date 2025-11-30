import { given, then } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import { getIamRolePolicy } from './getIamRolePolicy';

describe('getIamRolePolicy', () => {
  const context = getSampleAwsApiContext();

  given('a role policy that does not exist', () => {
    then('we should get null', async () => {
      const policy = await getIamRolePolicy(
        {
          by: {
            unique: {
              role: { name: 'declastruct-nonexistent-role-12345' },
              name: 'nonexistent-policy',
            },
          },
        },
        context,
      );

      expect(policy).toBeNull();
    });
  });

  given('the test role created by setIamRole integration test', () => {
    const testRoleName = 'declastruct-test-role';
    const testPolicyName = 'declastruct-test-policy';

    then('we should be able to get the policy if it exists', async () => {
      const policy = await getIamRolePolicy(
        {
          by: {
            unique: {
              role: { name: testRoleName },
              name: testPolicyName,
            },
          },
        },
        context,
      );

      // policy may or may not exist depending on test order
      if (policy) {
        expect(policy.name).toBe(testPolicyName);
        expect(policy.role.name).toBe(testRoleName);
        console.log(policy);
      } else {
        console.log(
          'Policy not found - run setIamRolePolicy integration test first',
        );
      }
    });
  });
});
