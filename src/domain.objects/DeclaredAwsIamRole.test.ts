import { given, then, when } from 'test-fns';

import { DeclaredAwsIamRole } from './DeclaredAwsIamRole';

describe('DeclaredAwsIamRole', () => {
  given('a valid role name', () => {
    when('instantiated', () => {
      let role: DeclaredAwsIamRole;

      then('it should instantiate', () => {
        role = new DeclaredAwsIamRole({
          name: 'test-execution-role',
          policies: [
            {
              effect: 'Allow',
              principal: { service: 'lambda.amazonaws.com' },
              action: 'sts:AssumeRole',
              resource: '*',
            },
          ],
        });
      });

      then('it should have the name', () => {
        expect(role).toMatchObject({ name: 'test-execution-role' });
      });

      then('metadata is undefined by default', () => {
        expect(role.arn).toBeUndefined();
      });
    });
  });

  given('all properties provided', () => {
    when('instantiated with metadata', () => {
      let role: DeclaredAwsIamRole;

      then('it should instantiate', () => {
        role = new DeclaredAwsIamRole({
          arn: 'arn:aws:iam::123456789012:role/test-role',
          name: 'test-role',
          path: '/service-roles/',
          description: 'test role description',
          policies: [
            {
              sid: 'AllowAssumeRole',
              effect: 'Allow',
              principal: { service: 'lambda.amazonaws.com' },
              action: 'sts:AssumeRole',
              resource: '*',
            },
          ],
          tags: { environment: 'test' },
        });
      });

      then('it should have all properties', () => {
        expect(role).toMatchObject({
          arn: 'arn:aws:iam::123456789012:role/test-role',
          name: 'test-role',
          path: '/service-roles/',
          description: 'test role description',
          tags: { environment: 'test' },
        });
        expect(role.policies).toHaveLength(1);
      });
    });
  });

  given('the static keys', () => {
    then('primary is defined as arn', () => {
      expect(DeclaredAwsIamRole.primary).toEqual(['arn']);
    });

    then('unique is defined as name', () => {
      expect(DeclaredAwsIamRole.unique).toEqual(['name']);
    });

    then('metadata is defined as arn', () => {
      expect(DeclaredAwsIamRole.metadata).toEqual(['arn']);
    });

    then('readonly is empty', () => {
      expect(DeclaredAwsIamRole.readonly).toEqual([]);
    });
  });
});
