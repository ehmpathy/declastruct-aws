import type { UniDateTime } from '@ehmpathy/uni-time';
import { given, then, when } from 'test-fns';

import { DeclaredAwsIamUserAccessKey } from './DeclaredAwsIamUserAccessKey';

describe('DeclaredAwsIamUserAccessKey', () => {
  given('minimal required properties', () => {
    when('instantiated', () => {
      let accessKey: DeclaredAwsIamUserAccessKey;

      then('it should instantiate', () => {
        accessKey = new DeclaredAwsIamUserAccessKey({
          user: { account: { id: '123456789012' }, username: 'test-user' },
          status: 'Active',
        });
      });

      then('it should have required properties', () => {
        expect(accessKey).toMatchObject({
          user: { account: { id: '123456789012' }, username: 'test-user' },
          status: 'Active',
        });
      });

      then('metadata is undefined by default', () => {
        expect(accessKey.accessKeyId).toBeUndefined();
      });

      then('readonly fields are undefined by default', () => {
        expect(accessKey.createDate).toBeUndefined();
        expect(accessKey.lastUsedDate).toBeUndefined();
        expect(accessKey.lastUsedService).toBeUndefined();
        expect(accessKey.lastUsedRegion).toBeUndefined();
      });
    });
  });

  given('all properties provided', () => {
    when('instantiated with metadata and readonly', () => {
      let accessKey: DeclaredAwsIamUserAccessKey;

      then('it should instantiate', () => {
        accessKey = new DeclaredAwsIamUserAccessKey({
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          user: { account: { id: '123456789012' }, username: 'test-user' },
          status: 'Active',
          createDate: '2024-01-15T10:30:00.000Z' as UniDateTime,
          lastUsedDate: '2024-06-01T14:22:00.000Z' as UniDateTime,
          lastUsedService: 's3',
          lastUsedRegion: 'us-east-1',
        });
      });

      then('it should have all properties', () => {
        expect(accessKey).toMatchObject({
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          user: { account: { id: '123456789012' }, username: 'test-user' },
          status: 'Active',
          createDate: '2024-01-15T10:30:00.000Z' as UniDateTime,
          lastUsedDate: '2024-06-01T14:22:00.000Z' as UniDateTime,
          lastUsedService: 's3',
          lastUsedRegion: 'us-east-1',
        });
      });
    });
  });

  given('an inactive key', () => {
    when('instantiated with Inactive status', () => {
      let accessKey: DeclaredAwsIamUserAccessKey;

      then('it should instantiate', () => {
        accessKey = new DeclaredAwsIamUserAccessKey({
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          user: { account: { id: '123456789012' }, username: 'test-user' },
          status: 'Inactive',
        });
      });

      then('it should have Inactive status', () => {
        expect(accessKey.status).toEqual('Inactive');
      });
    });
  });

  given('a key that was never used', () => {
    when('lastUsed fields are null', () => {
      let accessKey: DeclaredAwsIamUserAccessKey;

      then('it should instantiate with null lastUsed fields', () => {
        accessKey = new DeclaredAwsIamUserAccessKey({
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          user: { account: { id: '123456789012' }, username: 'test-user' },
          status: 'Active',
          createDate: '2024-01-15T10:30:00.000Z' as UniDateTime,
          lastUsedDate: null,
          lastUsedService: null,
          lastUsedRegion: null,
        });
      });

      then('it should have null lastUsed fields', () => {
        expect(accessKey.lastUsedDate).toBeNull();
        expect(accessKey.lastUsedService).toBeNull();
        expect(accessKey.lastUsedRegion).toBeNull();
      });
    });
  });

  given('the static keys', () => {
    then('primary is defined as accessKeyId', () => {
      expect(DeclaredAwsIamUserAccessKey.primary).toEqual(['accessKeyId']);
    });

    then('unique is not defined (no unique key)', () => {
      expect(
        (DeclaredAwsIamUserAccessKey as unknown as Record<string, unknown>)
          .unique,
      ).toBeUndefined();
    });

    then('metadata is defined as accessKeyId', () => {
      expect(DeclaredAwsIamUserAccessKey.metadata).toEqual(['accessKeyId']);
    });

    then('readonly is defined for all readonly fields', () => {
      expect(DeclaredAwsIamUserAccessKey.readonly).toEqual([
        'createDate',
        'lastUsedDate',
        'lastUsedService',
        'lastUsedRegion',
      ]);
    });
  });
});
