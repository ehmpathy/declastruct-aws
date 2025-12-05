import { LogGroup as SdkAwsLogGroup } from '@aws-sdk/client-cloudwatch-logs';
import { given, then } from 'test-fns';

import { castIntoDeclaredAwsLogGroup } from './castIntoDeclaredAwsLogGroup';

describe('castIntoDeclaredAwsLogGroup', () => {
  given('a complete log group from AWS', () => {
    then('it should map all fields correctly', () => {
      const input: SdkAwsLogGroup = {
        arn: 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/test-function',
        logGroupName: '/aws/lambda/test-function',
        logGroupClass: 'STANDARD',
        kmsKeyId:
          'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
        retentionInDays: 30,
        creationTime: 1705323000000, // 2024-01-15T10:30:00.000Z
        storedBytes: 1073741824,
      };

      const result = castIntoDeclaredAwsLogGroup(input);

      expect(result).toMatchObject({
        arn: 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/test-function',
        name: '/aws/lambda/test-function',
        class: 'STANDARD',
        kmsKeyId:
          'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
        retentionInDays: 30,
        storedBytes: 1073741824,
      });
      expect(result.createdAt).toBeDefined();
    });
  });

  given('a log group with missing logGroupClass', () => {
    then('it should default to STANDARD', () => {
      const input: SdkAwsLogGroup = {
        arn: 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/test-function',
        logGroupName: '/aws/lambda/test-function',
        // logGroupClass is undefined
        retentionInDays: 7,
        creationTime: 1705323000000,
        storedBytes: 0,
      };

      const result = castIntoDeclaredAwsLogGroup(input);

      expect(result.class).toBe('STANDARD');
    });
  });

  given('a log group with INFREQUENT_ACCESS class', () => {
    then('it should preserve the class', () => {
      const input: SdkAwsLogGroup = {
        arn: 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/archive-function',
        logGroupName: '/aws/lambda/archive-function',
        logGroupClass: 'INFREQUENT_ACCESS',
        retentionInDays: 365,
        creationTime: 1705323000000,
        storedBytes: 500000,
      };

      const result = castIntoDeclaredAwsLogGroup(input);

      expect(result.class).toBe('INFREQUENT_ACCESS');
    });
  });

  given('a log group with missing kmsKeyId', () => {
    then('it should set kmsKeyId to null', () => {
      const input: SdkAwsLogGroup = {
        arn: 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/test-function',
        logGroupName: '/aws/lambda/test-function',
        // kmsKeyId is undefined
        retentionInDays: 14,
        creationTime: 1705323000000,
        storedBytes: 1024,
      };

      const result = castIntoDeclaredAwsLogGroup(input);

      expect(result.kmsKeyId).toBeNull();
    });
  });

  given('a log group with missing retentionInDays', () => {
    then('it should set retentionInDays to null (never expire)', () => {
      const input: SdkAwsLogGroup = {
        arn: 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/test-function',
        logGroupName: '/aws/lambda/test-function',
        // retentionInDays is undefined in AWS SDK = never expire
        creationTime: 1705323000000,
        storedBytes: 2048,
      };

      const result = castIntoDeclaredAwsLogGroup(input);

      expect(result.retentionInDays).toBeNull();
    });
  });
});
