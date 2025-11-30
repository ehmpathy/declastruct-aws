import { given, then, when } from 'test-fns';

import { castIntoDeclaredAwsIamRolePolicy } from './castIntoDeclaredAwsIamRolePolicy';

describe('castIntoDeclaredAwsIamRolePolicy', () => {
  given('a policy document with statements', () => {
    when('cast to domain object', () => {
      let result: ReturnType<typeof castIntoDeclaredAwsIamRolePolicy>;

      then('it should cast', () => {
        result = castIntoDeclaredAwsIamRolePolicy({
          policyName: 'permissions',
          roleName: 'test-role',
          policyDocument: {
            statements: [
              {
                sid: 'AllowS3',
                effect: 'Allow',
                action: 's3:GetObject',
                resource: 'arn:aws:s3:::bucket/*',
              },
            ],
          },
        });
      });

      then('it should have the policy name', () => {
        expect(result.name).toBe('permissions');
      });

      then('it should have the role reference', () => {
        expect(result.role).toMatchObject({ name: 'test-role' });
      });

      then('it should have the statements', () => {
        expect(result.statements).toHaveLength(1);
        expect(result.statements[0]).toMatchObject({
          sid: 'AllowS3',
          effect: 'Allow',
          action: 's3:GetObject',
          resource: 'arn:aws:s3:::bucket/*',
        });
      });
    });
  });

  given('a policy document with multiple statements', () => {
    when('cast to domain object', () => {
      let result: ReturnType<typeof castIntoDeclaredAwsIamRolePolicy>;

      then('it should cast all statements', () => {
        result = castIntoDeclaredAwsIamRolePolicy({
          policyName: 'multi-permissions',
          roleName: 'multi-role',
          policyDocument: {
            statements: [
              {
                effect: 'Allow',
                action: ['s3:GetObject', 's3:PutObject'],
                resource: '*',
              },
              {
                effect: 'Deny',
                action: 's3:DeleteObject',
                resource: '*',
              },
            ],
          },
        });
      });

      then('it should have both statements', () => {
        expect(result.statements).toHaveLength(2);
        expect(result.statements[0]!.effect).toBe('Allow');
        expect(result.statements[1]!.effect).toBe('Deny');
      });
    });
  });

  given('a policy document with conditions', () => {
    when('cast to domain object', () => {
      let result: ReturnType<typeof castIntoDeclaredAwsIamRolePolicy>;

      then('it should preserve conditions', () => {
        result = castIntoDeclaredAwsIamRolePolicy({
          policyName: 'conditional',
          roleName: 'cond-role',
          policyDocument: {
            statements: [
              {
                effect: 'Allow',
                action: 's3:GetObject',
                resource: '*',
                condition: {
                  StringEquals: {
                    'aws:PrincipalTag/Department': 'Engineering',
                  },
                },
              },
            ],
          },
        });
      });

      then('it should have the condition', () => {
        expect(result.statements[0]!.condition).toEqual({
          StringEquals: { 'aws:PrincipalTag/Department': 'Engineering' },
        });
      });
    });
  });
});
