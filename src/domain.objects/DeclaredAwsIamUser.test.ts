import type { UniDateTime } from '@ehmpathy/uni-time';
import { given, then, when } from 'test-fns';

import { DeclaredAwsIamUser } from './DeclaredAwsIamUser';

describe('DeclaredAwsIamUser', () => {
  given('minimal required properties', () => {
    when('instantiated', () => {
      let user: DeclaredAwsIamUser;

      then('it should instantiate', () => {
        user = new DeclaredAwsIamUser({
          account: { id: '123456789012' },
          username: 'test-user',
        });
      });

      then('it should have the username', () => {
        expect(user).toMatchObject({
          username: 'test-user',
          account: { id: '123456789012' },
        });
      });

      then('metadata is undefined by default', () => {
        expect(user.id).toBeUndefined();
        expect(user.arn).toBeUndefined();
      });

      then('readonly is undefined by default', () => {
        expect(user.createDate).toBeUndefined();
      });
    });
  });

  given('all properties provided', () => {
    when('instantiated with metadata and readonly', () => {
      let user: DeclaredAwsIamUser;

      then('it should instantiate', () => {
        user = new DeclaredAwsIamUser({
          id: 'AIDAIOSFODNN7EXAMPLE',
          arn: 'arn:aws:iam::123456789012:user/test-user',
          account: { id: '123456789012' },
          username: 'test-user',
          path: '/developers/',
          createDate: '2024-01-15T10:30:00.000Z' as UniDateTime,
        });
      });

      then('it should have all properties', () => {
        expect(user).toMatchObject({
          id: 'AIDAIOSFODNN7EXAMPLE',
          arn: 'arn:aws:iam::123456789012:user/test-user',
          account: { id: '123456789012' },
          username: 'test-user',
          path: '/developers/',
          createDate: '2024-01-15T10:30:00.000Z' as UniDateTime,
        });
      });
    });
  });

  given('the static keys', () => {
    then('primary is defined as id', () => {
      expect(DeclaredAwsIamUser.primary).toEqual(['id']);
    });

    then('unique is defined as account + username', () => {
      expect(DeclaredAwsIamUser.unique).toEqual(['account', 'username']);
    });

    then('metadata is defined as id and arn', () => {
      expect(DeclaredAwsIamUser.metadata).toEqual(['id', 'arn']);
    });

    then('readonly is defined as createDate', () => {
      expect(DeclaredAwsIamUser.readonly).toEqual(['createDate']);
    });
  });
});
