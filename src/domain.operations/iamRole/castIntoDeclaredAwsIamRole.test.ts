import type { Role as SdkAwsRole } from '@aws-sdk/client-iam';
import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { castIntoDeclaredAwsIamRole } from './castIntoDeclaredAwsIamRole';

describe('castIntoDeclaredAwsIamRole', () => {
  given('an AWS Role with all properties', () => {
    when('cast to domain object', () => {
      let result: ReturnType<typeof castIntoDeclaredAwsIamRole>;

      then('it should cast', () => {
        const trustPolicyDoc = {
          Statement: [
            {
              Effect: 'Allow',
              Principal: { Service: 'lambda.amazonaws.com' },
              Action: 'sts:AssumeRole',
              Resource: '*',
            },
          ],
        };
        const awsRole = {
          RoleName: 'test-execution-role',
          Arn: 'arn:aws:iam::123456789012:role/test-execution-role',
          Path: '/service-roles/',
          Description: 'Test execution role',
          Tags: [{ Key: 'environment', Value: 'test' }],
          AssumeRolePolicyDocument: encodeURIComponent(
            JSON.stringify(trustPolicyDoc),
          ),
        } as SdkAwsRole;
        result = castIntoDeclaredAwsIamRole(awsRole);
      });

      then('it should have all properties mapped', () => {
        expect(result).toMatchObject({
          arn: 'arn:aws:iam::123456789012:role/test-execution-role',
          name: 'test-execution-role',
          path: '/service-roles/',
          description: 'Test execution role',
          tags: { environment: 'test' },
        });
        expect(result.policies).toHaveLength(1);
        expect(result.policies[0]).toMatchObject({
          effect: 'Allow',
          action: 'sts:AssumeRole',
        });
      });
    });
  });

  given('an AWS Role without name', () => {
    when('cast to domain object', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const awsRole = {
          Arn: 'arn:aws:iam::123456789012:role/some-role',
        } as SdkAwsRole;
        const error = await getError(() => castIntoDeclaredAwsIamRole(awsRole));
        expect(error.message).toContain('role lacks name');
      });
    });
  });

  given('an AWS Role without arn', () => {
    when('cast to domain object', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const awsRole = {
          RoleName: 'some-role',
        } as SdkAwsRole;
        const error = await getError(() => castIntoDeclaredAwsIamRole(awsRole));
        expect(error.message).toContain('role lacks arn');
      });
    });
  });

  given('an AWS Role with minimal properties', () => {
    when('cast to domain object', () => {
      let result: ReturnType<typeof castIntoDeclaredAwsIamRole>;

      then('it should cast successfully', () => {
        const awsRole = {
          RoleName: 'minimal-role',
          Arn: 'arn:aws:iam::123456789012:role/minimal-role',
        } as SdkAwsRole;
        result = castIntoDeclaredAwsIamRole(awsRole);
      });

      then('it should have required properties', () => {
        expect(result.name).toBe('minimal-role');
        expect(result.arn).toBe('arn:aws:iam::123456789012:role/minimal-role');
        expect(result.policies).toEqual([]);
      });
    });
  });
});
