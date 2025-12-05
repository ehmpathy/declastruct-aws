import { given, then } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import type { DeclaredAwsIamRole } from '../../domain.objects/DeclaredAwsIamRole';
import { getIamRole } from './getIamRole';
import { setIamRole } from './setIamRole';

describe('setIamRole', () => {
  const context = getSampleAwsApiContext();

  const testRoleName = 'declastruct-test-role';

  const roleDesired: Omit<DeclaredAwsIamRole, 'arn'> = {
    name: testRoleName,
    path: '/',
    description: 'Test role for declastruct integration tests',
    policies: [
      {
        effect: 'Allow',
        principal: { service: 'lambda.amazonaws.com' },
        action: 'sts:AssumeRole',
        // note: no resource field - assume role policies must not have Resource
      },
    ],
    tags: { environment: 'test', managedBy: 'declastruct' },
  };

  given('a role to create', () => {
    then('we should be able to finsert a role', async () => {
      const roleAfter = await setIamRole({ finsert: roleDesired }, context);

      expect(roleAfter.name).toBe(testRoleName);
      expect(roleAfter.arn).toContain('arn:aws:iam::');
      expect(roleAfter.arn).toContain(`:role/${testRoleName}`);
      console.log(roleAfter);
    });

    then('we should be able to get the role we created', async () => {
      const role = await getIamRole(
        { by: { unique: { name: testRoleName } } },
        context,
      );

      expect(role).not.toBeNull();
      expect(role?.name).toBe(testRoleName);
    });

    then('finsert should be idempotent', async () => {
      const roleAgain = await setIamRole({ finsert: roleDesired }, context);

      expect(roleAgain.name).toBe(testRoleName);
    });

    then('we should be able to upsert the role with updated tags', async () => {
      const roleUpdated = await setIamRole(
        {
          upsert: {
            ...roleDesired,
            tags: {
              environment: 'test',
              managedBy: 'declastruct',
              updated: 'true',
            },
          },
        },
        context,
      );

      expect(roleUpdated.name).toBe(testRoleName);
      console.log(roleUpdated);
    });
  });
});
