import { given, then, when } from 'test-fns';

import { DeclaredAwsIamPolicy } from './DeclaredAwsIamPolicy';

describe('DeclaredAwsIamPolicy', () => {
  given('a valid policy name and document', () => {
    when('instantiated', () => {
      let policy: DeclaredAwsIamPolicy;

      then('it should instantiate', () => {
        policy = new DeclaredAwsIamPolicy({
          name: 'test-policy',
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
        expect(policy).toMatchObject({ name: 'test-policy' });
      });

      then('metadata is undefined by default', () => {
        expect(policy.arn).toBeUndefined();
      });

      then('path is undefined by default', () => {
        expect(policy.path).toBeUndefined();
      });
    });
  });

  given('all properties provided', () => {
    when('instantiated with metadata and tags', () => {
      let policy: DeclaredAwsIamPolicy;

      then('it should instantiate', () => {
        policy = new DeclaredAwsIamPolicy({
          arn: 'arn:aws:iam::123456789012:policy/test-policy',
          name: 'test-policy',
          path: '/service-policies/',
          description: 'A test policy for unit testing',
          document: {
            statements: [
              {
                sid: 'AllowS3Access',
                effect: 'Allow',
                action: ['s3:GetObject', 's3:PutObject'],
                resource: 'arn:aws:s3:::bucket/*',
              },
            ],
          },
          tags: { environment: 'test', managedBy: 'declastruct' },
        });
      });

      then('it should have all properties', () => {
        expect(policy).toMatchObject({
          arn: 'arn:aws:iam::123456789012:policy/test-policy',
          name: 'test-policy',
          path: '/service-policies/',
          description: 'A test policy for unit testing',
          tags: { environment: 'test', managedBy: 'declastruct' },
        });
        expect(policy.document.statements).toHaveLength(1);
      });
    });
  });

  given('an aws-managed policy arn', () => {
    when('instantiated', () => {
      let policy: DeclaredAwsIamPolicy;

      then('it should instantiate with aws-managed arn', () => {
        policy = new DeclaredAwsIamPolicy({
          arn: 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess',
          name: 'AmazonS3ReadOnlyAccess',
          path: '/',
          document: {
            statements: [
              {
                effect: 'Allow',
                action: ['s3:Get*', 's3:List*'],
                resource: '*',
              },
            ],
          },
        });
      });

      then('it should have the aws-managed arn', () => {
        expect(policy.arn).toBe(
          'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess',
        );
      });
    });
  });

  given('the static keys', () => {
    then('primary is defined as arn', () => {
      expect(DeclaredAwsIamPolicy.primary).toEqual(['arn']);
    });

    then('unique is defined as name and path', () => {
      expect(DeclaredAwsIamPolicy.unique).toEqual(['name', 'path']);
    });

    then('metadata is defined as arn', () => {
      expect(DeclaredAwsIamPolicy.metadata).toEqual(['arn']);
    });

    then('readonly is empty', () => {
      expect(DeclaredAwsIamPolicy.readonly).toEqual([]);
    });
  });
});
