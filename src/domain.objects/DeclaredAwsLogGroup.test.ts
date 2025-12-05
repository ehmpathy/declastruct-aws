import type { UniDateTime } from '@ehmpathy/uni-time';
import { given, then, when } from 'test-fns';

import { DeclaredAwsLogGroup } from './DeclaredAwsLogGroup';

describe('DeclaredAwsLogGroup', () => {
  given('a valid log group name', () => {
    when('instantiated with minimal properties', () => {
      let logGroup: DeclaredAwsLogGroup;

      then('it should instantiate', () => {
        logGroup = new DeclaredAwsLogGroup({
          name: '/aws/lambda/svc-chat-prod-getDisplayableMessages',
          class: 'STANDARD',
          kmsKeyId: null,
        });
      });

      then('it should have the name', () => {
        expect(logGroup).toMatchObject({
          name: '/aws/lambda/svc-chat-prod-getDisplayableMessages',
        });
      });

      then('metadata is undefined by default', () => {
        expect(logGroup.arn).toBeUndefined();
      });

      then('readonly fields are undefined by default', () => {
        expect(logGroup.storedBytes).toBeUndefined();
        expect(logGroup.createdAt).toBeUndefined();
        expect(logGroup.retentionInDays).toBeUndefined();
      });
    });
  });

  given('all properties provided', () => {
    when('instantiated with metadata and readonly fields', () => {
      let logGroup: DeclaredAwsLogGroup;

      then('it should instantiate', () => {
        logGroup = new DeclaredAwsLogGroup({
          arn: 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/svc-chat-prod-getDisplayableMessages',
          name: '/aws/lambda/svc-chat-prod-getDisplayableMessages',
          class: 'STANDARD',
          kmsKeyId:
            'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
          retentionInDays: 30,
          createdAt: '2024-01-15T10:30:00.000Z' as UniDateTime,
          storedBytes: 1073741824,
        });
      });

      then('it should have all properties', () => {
        expect(logGroup).toMatchObject({
          arn: 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/svc-chat-prod-getDisplayableMessages',
          name: '/aws/lambda/svc-chat-prod-getDisplayableMessages',
          class: 'STANDARD',
          kmsKeyId:
            'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
          retentionInDays: 30,
          createdAt: '2024-01-15T10:30:00.000Z',
          storedBytes: 1073741824,
        });
      });
    });
  });

  given('log group with INFREQUENT_ACCESS class', () => {
    when('instantiated', () => {
      let logGroup: DeclaredAwsLogGroup;

      then('it should accept the class', () => {
        logGroup = new DeclaredAwsLogGroup({
          name: '/aws/lambda/archive-function',
          class: 'INFREQUENT_ACCESS',
          kmsKeyId: null,
        });
        expect(logGroup.class).toBe('INFREQUENT_ACCESS');
      });
    });
  });

  given('log group with null retention', () => {
    when('instantiated', () => {
      let logGroup: DeclaredAwsLogGroup;

      then('it should accept null retention (never expire)', () => {
        logGroup = new DeclaredAwsLogGroup({
          name: '/aws/lambda/permanent-logs',
          class: 'STANDARD',
          kmsKeyId: null,
          retentionInDays: null,
        });
        expect(logGroup.retentionInDays).toBeNull();
      });
    });
  });

  given('the static keys', () => {
    then('primary is defined as arn', () => {
      expect(DeclaredAwsLogGroup.primary).toEqual(['arn']);
    });

    then('unique is defined as name', () => {
      expect(DeclaredAwsLogGroup.unique).toEqual(['name']);
    });

    then('metadata is defined as arn', () => {
      expect(DeclaredAwsLogGroup.metadata).toEqual(['arn']);
    });

    then('readonly includes storedBytes, createdAt, retentionInDays', () => {
      expect(DeclaredAwsLogGroup.readonly).toEqual([
        'storedBytes',
        'createdAt',
        'retentionInDays',
      ]);
    });
  });
});
