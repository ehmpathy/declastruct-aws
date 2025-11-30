import { given, then, when } from 'test-fns';

import { DeclaredAwsIamRolePolicy } from './DeclaredAwsIamRolePolicy';

describe('DeclaredAwsIamRolePolicy', () => {
  given('a valid policy name and role reference', () => {
    when('instantiated', () => {
      let policy: DeclaredAwsIamRolePolicy;

      then('it should instantiate', () => {
        policy = new DeclaredAwsIamRolePolicy({
          name: 'permissions',
          role: { name: 'test-execution-role' },
          statements: [
            {
              effect: 'Allow',
              action: 's3:GetObject',
              resource: 'arn:aws:s3:::bucket/*',
            },
          ],
        });
      });

      then('it should have the name', () => {
        expect(policy).toMatchObject({ name: 'permissions' });
      });

      then('it should have the role reference', () => {
        expect(policy.role).toMatchObject({ name: 'test-execution-role' });
      });
    });
  });

  given('all properties provided', () => {
    when('instantiated with multiple statements', () => {
      let policy: DeclaredAwsIamRolePolicy;

      then('it should instantiate', () => {
        policy = new DeclaredAwsIamRolePolicy({
          name: 'full-permissions',
          role: { name: 'test-role' },
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
        });
      });

      then('it should have all statements', () => {
        expect(policy.statements).toHaveLength(2);
        expect(policy.statements[0]!.sid).toBe('AllowS3Read');
        expect(policy.statements[1]!.sid).toBe('AllowLambdaInvoke');
      });
    });
  });

  given('the static keys', () => {
    then('unique is defined as role and name', () => {
      expect(DeclaredAwsIamRolePolicy.unique).toEqual(['role', 'name']);
    });

    then('metadata is empty (no primary key for inline policies)', () => {
      expect(DeclaredAwsIamRolePolicy.metadata).toEqual([]);
    });

    then('readonly is empty', () => {
      expect(DeclaredAwsIamRolePolicy.readonly).toEqual([]);
    });
  });
});
