import { given, then, when } from 'test-fns';

import { DeclaredAwsIamRolePolicyAttachedManaged } from './DeclaredAwsIamRolePolicyAttachedManaged';

describe('DeclaredAwsIamRolePolicyAttachedManaged', () => {
  given('a valid role reference and policy reference', () => {
    when('instantiated', () => {
      let attachment: DeclaredAwsIamRolePolicyAttachedManaged;

      then('it should instantiate', () => {
        attachment = new DeclaredAwsIamRolePolicyAttachedManaged({
          role: { name: 'test-execution-role' },
          policy: { arn: 'arn:aws:iam::123456789012:policy/test-policy' },
        });
      });

      then('it should have the role reference', () => {
        expect(attachment.role).toMatchObject({ name: 'test-execution-role' });
      });

      then('it should have the policy reference', () => {
        expect(attachment.policy).toMatchObject({
          arn: 'arn:aws:iam::123456789012:policy/test-policy',
        });
      });
    });
  });

  given('an aws-managed policy', () => {
    when('instantiated with aws-managed policy arn', () => {
      let attachment: DeclaredAwsIamRolePolicyAttachedManaged;

      then('it should instantiate', () => {
        attachment = new DeclaredAwsIamRolePolicyAttachedManaged({
          role: { name: 'admin-role' },
          policy: { arn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess' },
        });
      });

      then('it should have the aws-managed policy arn', () => {
        expect(attachment.policy.arn).toBe(
          'arn:aws:iam::aws:policy/AmazonS3FullAccess',
        );
      });
    });
  });

  given('a customer-managed policy in a path', () => {
    when('instantiated with path in arn', () => {
      let attachment: DeclaredAwsIamRolePolicyAttachedManaged;

      then('it should instantiate', () => {
        attachment = new DeclaredAwsIamRolePolicyAttachedManaged({
          role: { name: 'service-role' },
          policy: {
            arn: 'arn:aws:iam::123456789012:policy/services/my-service-policy',
          },
        });
      });

      then('it should have the policy with path in arn', () => {
        expect(attachment.policy.arn).toBe(
          'arn:aws:iam::123456789012:policy/services/my-service-policy',
        );
      });
    });
  });

  given('the static keys', () => {
    then('unique is defined as role and policy', () => {
      expect(DeclaredAwsIamRolePolicyAttachedManaged.unique).toEqual([
        'role',
        'policy',
      ]);
    });

    then('metadata is empty (no primary key for attachments)', () => {
      expect(DeclaredAwsIamRolePolicyAttachedManaged.metadata).toEqual([]);
    });

    then('readonly is empty', () => {
      expect(DeclaredAwsIamRolePolicyAttachedManaged.readonly).toEqual([]);
    });
  });
});
