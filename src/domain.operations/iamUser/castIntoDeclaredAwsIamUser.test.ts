import type { User } from '@aws-sdk/client-iam';
import { getError, given, then, when } from 'test-fns';

import { castIntoDeclaredAwsIamUser } from './castIntoDeclaredAwsIamUser';

describe('castIntoDeclaredAwsIamUser', () => {
  given('a valid AWS SDK User', () => {
    const user: User = {
      UserId: 'AIDAIOSFODNN7EXAMPLE',
      Arn: 'arn:aws:iam::123456789012:user/test-user',
      UserName: 'test-user',
      Path: '/developers/',
      CreateDate: new Date('2024-01-15T10:30:00.000Z'),
    };
    const account = { id: '123456789012' };

    when('cast', () => {
      then('it should return a DeclaredAwsIamUser with readonly fields', () => {
        const result = castIntoDeclaredAwsIamUser({ user, account });

        expect(result).toMatchObject({
          id: 'AIDAIOSFODNN7EXAMPLE',
          arn: 'arn:aws:iam::123456789012:user/test-user',
          account: { id: '123456789012' },
          username: 'test-user',
          path: '/developers/',
          createDate: '2024-01-15T10:30:00.000Z',
        });
      });
    });
  });

  given('a User with default path', () => {
    const user: User = {
      UserId: 'AIDAIOSFODNN7EXAMPLE',
      Arn: 'arn:aws:iam::123456789012:user/test-user',
      UserName: 'test-user',
      Path: '/',
      CreateDate: new Date('2024-01-15T10:30:00.000Z'),
    };
    const account = { id: '123456789012' };

    when('cast', () => {
      then('it should include the default path', () => {
        const result = castIntoDeclaredAwsIamUser({ user, account });

        expect(result.path).toEqual('/');
      });
    });
  });

  given('a User missing UserId', () => {
    const user = {
      Arn: 'arn:aws:iam::123456789012:user/test-user',
      UserName: 'test-user',
      Path: '/',
      CreateDate: new Date('2024-01-15T10:30:00.000Z'),
    } as User;
    const account = { id: '123456789012' };

    when('cast', () => {
      then('it should throw', async () => {
        const error = await getError(() =>
          castIntoDeclaredAwsIamUser({ user, account }),
        );
        expect(error).toBeDefined();
      });
    });
  });

  given('a User missing CreateDate', () => {
    const user = {
      UserId: 'AIDAIOSFODNN7EXAMPLE',
      Arn: 'arn:aws:iam::123456789012:user/test-user',
      UserName: 'test-user',
      Path: '/',
    } as User;
    const account = { id: '123456789012' };

    when('cast', () => {
      then('it should throw', async () => {
        const error = await getError(() =>
          castIntoDeclaredAwsIamUser({ user, account }),
        );
        expect(error).toBeDefined();
      });
    });
  });
});
