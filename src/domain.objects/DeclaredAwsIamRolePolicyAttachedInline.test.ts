import { given, then, when } from 'test-fns';

import { DeclaredAwsIamRolePolicyAttachedInline } from './DeclaredAwsIamRolePolicyAttachedInline';

describe('DeclaredAwsIamRolePolicyAttachedInline', () => {
  given('a valid policy name, role reference, and document', () => {
    when('instantiated', () => {
      let policy: DeclaredAwsIamRolePolicyAttachedInline;

      then('it should instantiate', () => {
        policy = new DeclaredAwsIamRolePolicyAttachedInline({
          name: 'permissions',
          role: { name: 'test-execution-role' },
          document: {
            statements: [
              {
                effect: 'Allow',
                action: 's3:GetObject',
                resource: 'arn:aws:s3:::bucket/*',
              },
            ],
          },
        });
      });

      then('it should have the name', () => {
        expect(policy).toMatchObject({ name: 'permissions' });
      });

      then('it should have the role reference', () => {
        expect(policy.role).toMatchObject({ name: 'test-execution-role' });
      });

      then('it should have the document', () => {
        expect(policy.document.statements).toHaveLength(1);
      });
    });
  });

  given('all properties provided', () => {
    when('instantiated with multiple statements', () => {
      let policy: DeclaredAwsIamRolePolicyAttachedInline;

      then('it should instantiate', () => {
        policy = new DeclaredAwsIamRolePolicyAttachedInline({
          name: 'full-permissions',
          role: { name: 'test-role' },
          document: {
            statements: [
              {
                sid: 'AllowS3Read',
                effect: 'Allow',
                action: ['s3:GetObject', 's3:ListBucket'],
                resource: ['arn:aws:s3:::bucket', 'arn:aws:s3:::bucket/*'],
              },
              {
                sid: 'AllowLambdaInvoke',
                effect: 'Allow',
                action: 'lambda:InvokeFunction',
                resource: '*',
              },
            ],
          },
        });
      });

      then('it should have all statements', () => {
        expect(policy.document.statements).toHaveLength(2);
        expect(policy.document.statements[0]!.sid).toBe('AllowS3Read');
        expect(policy.document.statements[1]!.sid).toBe('AllowLambdaInvoke');
      });
    });
  });

  given('a policy with conditions', () => {
    when('instantiated with condition operators', () => {
      let policy: DeclaredAwsIamRolePolicyAttachedInline;

      then('it should instantiate', () => {
        policy = new DeclaredAwsIamRolePolicyAttachedInline({
          name: 'conditional-permissions',
          role: { name: 'oidc-role' },
          document: {
            statements: [
              {
                effect: 'Allow',
                action: 'sts:AssumeRoleWithWebIdentity',
                resource: '*',
                condition: {
                  StringEquals: {
                    'token.actions.githubusercontent.com:aud':
                      'sts.amazonaws.com',
                  },
                  StringLike: {
                    'token.actions.githubusercontent.com:sub': 'repo:org/*:*',
                  },
                },
              },
            ],
          },
        });
      });

      then('it should preserve conditions', () => {
        expect(policy.document.statements[0]!.condition).toMatchObject({
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          StringLike: {
            'token.actions.githubusercontent.com:sub': 'repo:org/*:*',
          },
        });
      });
    });
  });

  given('the static keys', () => {
    then('unique is defined as role and name', () => {
      expect(DeclaredAwsIamRolePolicyAttachedInline.unique).toEqual([
        'role',
        'name',
      ]);
    });

    then('metadata is empty (no primary key for inline policies)', () => {
      expect(DeclaredAwsIamRolePolicyAttachedInline.metadata).toEqual([]);
    });

    then('readonly is empty', () => {
      expect(DeclaredAwsIamRolePolicyAttachedInline.readonly).toEqual([]);
    });
  });
});
