import { given, then, useBeforeAll } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import { getIamRole } from './getIamRole';

describe('getIamRole', () => {
  const context = useBeforeAll(() => getSampleAwsApiContext());

  given('a common aws service role', () => {
    then(
      'we should be able to get the AWSServiceRoleForSupport role',
      async () => {
        const role = await getIamRole(
          {
            by: {
              unique: {
                name: 'AWSServiceRoleForSupport',
              },
            },
          },
          context,
        );

        expect(role).not.toBeNull();
        expect(role?.name).toBe('AWSServiceRoleForSupport');
        expect(role?.arn).toContain('arn:aws:iam::');
        expect(role?.arn).toContain(':role/aws-service-role/');
        console.log(role);
      },
    );
  });

  given('a role that does not exist', () => {
    then('we should get null', async () => {
      const role = await getIamRole(
        {
          by: {
            unique: {
              name: 'declastruct-nonexistent-role-12345',
            },
          },
        },
        context,
      );

      expect(role).toBeNull();
    });
  });
});
