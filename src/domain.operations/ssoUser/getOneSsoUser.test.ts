import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import * as getAllSsoUsersModule from './getAllSsoUsers';
import { getOneSsoUser } from './getOneSsoUser';

jest.mock('./getAllSsoUsers');

const context = getMockedAwsApiContext();

const instanceRef = { ownerAccount: { id: '123456789012' } };

describe('getOneSsoUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('a user ref by unique', () => {
    then('we should find user by username from getAllSsoUsers', async () => {
      const mockUser = {
        id: 'user-uuid-1234',
        instance: instanceRef,
        userName: 'demo@example.com',
        displayName: 'Demo User',
        email: 'demo@example.com',
      };

      (getAllSsoUsersModule.getAllSsoUsers as jest.Mock).mockResolvedValue([
        mockUser,
      ]);

      const result = await getOneSsoUser(
        {
          by: {
            unique: { instance: instanceRef, userName: 'demo@example.com' },
          },
        },
        context,
      );

      expect(getAllSsoUsersModule.getAllSsoUsers).toHaveBeenCalledWith(
        { where: { instance: instanceRef } },
        expect.anything(),
      );
      expect(result).not.toBeNull();
      expect(result?.userName).toBe('demo@example.com');
    });
  });

  given('a user ref by ref (generic)', () => {
    then('we should route unique refs to lookup', async () => {
      const mockUser = {
        id: 'user-uuid-1234',
        instance: instanceRef,
        userName: 'demo@example.com',
      };

      (getAllSsoUsersModule.getAllSsoUsers as jest.Mock).mockResolvedValue([
        mockUser,
      ]);

      const result = await getOneSsoUser(
        {
          by: { ref: { instance: instanceRef, userName: 'demo@example.com' } },
        },
        context,
      );

      expect(result).not.toBeNull();
    });
  });

  given('a user that does not exist', () => {
    then('we should return null when username not found', async () => {
      (getAllSsoUsersModule.getAllSsoUsers as jest.Mock).mockResolvedValue([]);

      const result = await getOneSsoUser(
        {
          by: {
            unique: {
              instance: instanceRef,
              userName: 'nonexistent@example.com',
            },
          },
        },
        context,
      );

      expect(result).toBeNull();
    });
  });
});
