import { given, then, when } from 'test-fns';

import { DeclaredAwsIamPolicyDocument } from '@src/domain.objects/DeclaredAwsIamPolicyDocument';

import { castIntoDeclaredAwsIamRolePolicyAttachedInline } from './castIntoDeclaredAwsIamRolePolicyAttachedInline';

describe('castIntoDeclaredAwsIamRolePolicyAttachedInline', () => {
  given('a policy document with statements', () => {
    when('cast to domain object', () => {
      let result: ReturnType<
        typeof castIntoDeclaredAwsIamRolePolicyAttachedInline
      >;

      then('it should cast', () => {
        result = castIntoDeclaredAwsIamRolePolicyAttachedInline({
          policyName: 'permissions',
          roleName: 'test-role',
          policyDocument: DeclaredAwsIamPolicyDocument.as({
            statements: [
              {
                sid: 'AllowS3',
                effect: 'Allow',
                action: 's3:GetObject',
                resource: 'arn:aws:s3:::bucket/*',
              },
            ],
          }),
        });
      });

      then('it should have the policy name', () => {
        expect(result.name).toBe('permissions');
      });

      then('it should have the role reference', () => {
        expect(result.role).toMatchObject({ name: 'test-role' });
      });

      then('it should have the document', () => {
        expect(result.document.statements).toHaveLength(1);
        expect(result.document.statements[0]).toMatchObject({
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
      let result: ReturnType<
        typeof castIntoDeclaredAwsIamRolePolicyAttachedInline
      >;

      then('it should cast all statements', () => {
        result = castIntoDeclaredAwsIamRolePolicyAttachedInline({
          policyName: 'multi-permissions',
          roleName: 'multi-role',
          policyDocument: DeclaredAwsIamPolicyDocument.as({
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
          }),
        });
      });

      then('it should have both statements', () => {
        expect(result.document.statements).toHaveLength(2);
        expect(result.document.statements[0]!.effect).toBe('Allow');
        expect(result.document.statements[1]!.effect).toBe('Deny');
      });
    });
  });

  given('a policy document with conditions', () => {
    when('cast to domain object', () => {
      let result: ReturnType<
        typeof castIntoDeclaredAwsIamRolePolicyAttachedInline
      >;

      then('it should preserve conditions', () => {
        result = castIntoDeclaredAwsIamRolePolicyAttachedInline({
          policyName: 'conditional',
          roleName: 'cond-role',
          policyDocument: DeclaredAwsIamPolicyDocument.as({
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
          }),
        });
      });

      then('it should have the condition', () => {
        expect(result.document.statements[0]!.condition).toEqual({
          StringEquals: { 'aws:PrincipalTag/Department': 'Engineering' },
        });
      });
    });
  });
});
