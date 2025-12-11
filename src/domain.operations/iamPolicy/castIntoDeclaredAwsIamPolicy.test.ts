import { given, then, when } from 'test-fns';

import { castIntoDeclaredAwsIamPolicy } from './castIntoDeclaredAwsIamPolicy';

describe('castIntoDeclaredAwsIamPolicy', () => {
  given('a policy response with a document', () => {
    when('cast to domain object', () => {
      let result: ReturnType<typeof castIntoDeclaredAwsIamPolicy>;

      then('it should cast', () => {
        result = castIntoDeclaredAwsIamPolicy({
          policy: {
            Arn: 'arn:aws:iam::123456789012:policy/test-policy',
            PolicyName: 'test-policy',
            Path: '/',
            Description: 'A test policy',
          },
          policyDocument: JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::bucket/*',
              },
            ],
          }),
        });
      });

      then('it should have the arn', () => {
        expect(result.arn).toBe('arn:aws:iam::123456789012:policy/test-policy');
      });

      then('it should have the name', () => {
        expect(result.name).toBe('test-policy');
      });

      then('it should have the path', () => {
        expect(result.path).toBe('/');
      });

      then('it should have the description', () => {
        expect(result.description).toBe('A test policy');
      });

      then('it should have the document with statements', () => {
        expect(result.document.statements).toHaveLength(1);
        expect(result.document.statements[0]).toMatchObject({
          effect: 'Allow',
          action: 's3:GetObject',
          resource: 'arn:aws:s3:::bucket/*',
        });
      });
    });
  });

  given('a policy response with tags', () => {
    when('cast to domain object', () => {
      let result: ReturnType<typeof castIntoDeclaredAwsIamPolicy>;

      then('it should cast with tags', () => {
        result = castIntoDeclaredAwsIamPolicy({
          policy: {
            Arn: 'arn:aws:iam::123456789012:policy/tagged-policy',
            PolicyName: 'tagged-policy',
            Path: '/',
          },
          policyDocument: JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: '*',
                Resource: '*',
              },
            ],
          }),
          tags: [
            { Key: 'environment', Value: 'test' },
            { Key: 'managedBy', Value: 'declastruct' },
          ],
        });
      });

      then('it should have the tags', () => {
        expect(result.tags).toEqual({
          environment: 'test',
          managedBy: 'declastruct',
        });
      });
    });
  });

  given('a policy with a custom path', () => {
    when('cast to domain object', () => {
      let result: ReturnType<typeof castIntoDeclaredAwsIamPolicy>;

      then('it should cast with path', () => {
        result = castIntoDeclaredAwsIamPolicy({
          policy: {
            Arn: 'arn:aws:iam::123456789012:policy/services/my-service-policy',
            PolicyName: 'my-service-policy',
            Path: '/services/',
          },
          policyDocument: JSON.stringify({
            Version: '2012-10-17',
            Statement: [{ Effect: 'Allow', Action: '*', Resource: '*' }],
          }),
        });
      });

      then('it should have the custom path', () => {
        expect(result.path).toBe('/services/');
      });
    });
  });

  given('a policy response without description', () => {
    when('cast to domain object', () => {
      let result: ReturnType<typeof castIntoDeclaredAwsIamPolicy>;

      then('it should cast with undefined description', () => {
        result = castIntoDeclaredAwsIamPolicy({
          policy: {
            Arn: 'arn:aws:iam::123456789012:policy/no-desc-policy',
            PolicyName: 'no-desc-policy',
            Path: '/',
          },
          policyDocument: JSON.stringify({
            Version: '2012-10-17',
            Statement: [{ Effect: 'Allow', Action: '*', Resource: '*' }],
          }),
        });
      });

      then('it should have undefined description', () => {
        expect(result.description).toBeUndefined();
      });
    });
  });

  given('a policy response with multiple statements', () => {
    when('cast to domain object', () => {
      let result: ReturnType<typeof castIntoDeclaredAwsIamPolicy>;

      then('it should cast all statements', () => {
        result = castIntoDeclaredAwsIamPolicy({
          policy: {
            Arn: 'arn:aws:iam::123456789012:policy/multi-statement',
            PolicyName: 'multi-statement',
            Path: '/',
          },
          policyDocument: JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'AllowS3Read',
                Effect: 'Allow',
                Action: ['s3:GetObject', 's3:ListBucket'],
                Resource: '*',
              },
              {
                Sid: 'DenyS3Delete',
                Effect: 'Deny',
                Action: 's3:DeleteObject',
                Resource: '*',
              },
            ],
          }),
        });
      });

      then('it should have both statements', () => {
        expect(result.document.statements).toHaveLength(2);
        expect(result.document.statements[0]!.sid).toBe('AllowS3Read');
        expect(result.document.statements[0]!.effect).toBe('Allow');
        expect(result.document.statements[1]!.sid).toBe('DenyS3Delete');
        expect(result.document.statements[1]!.effect).toBe('Deny');
      });
    });
  });
});
