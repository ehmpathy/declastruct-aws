import {
  CreateUserCommand,
  IdentitystoreClient,
  UpdateUserCommand,
} from '@aws-sdk/client-identitystore';
import { given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';
import * as ssoInstanceModule from '@src/domain.operations/ssoInstance/getOneSsoInstance';

import * as getModule from './getOneSsoUser';
import { setSsoUser } from './setSsoUser';

jest.mock('@aws-sdk/client-identitystore');
jest.mock('./getOneSsoUser');
jest.mock('../ssoInstance/getOneSsoInstance');

const mockSend = jest.fn();
(IdentitystoreClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

// mock sso instance lookup
const mockInstance = {
  arn: 'arn:aws:sso:::instance/ssoins-1234567890abcdef',
  identityStoreId: 'd-1234567890',
  ownerAccount: { id: '123456789012' },
};
(ssoInstanceModule.getOneSsoInstance as jest.Mock).mockResolvedValue(
  mockInstance,
);

const instanceRef = { ownerAccount: { id: '123456789012' } };

describe('setSsoUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ssoInstanceModule.getOneSsoInstance as jest.Mock).mockResolvedValue(
      mockInstance,
    );
  });

  given('a user that does not exist', () => {
    when('findsert is called', () => {
      then('it should create the user', async () => {
        const userId = 'user-uuid-1234';

        // mock lookup returns null (not found)
        (getModule.getOneSsoUser as jest.Mock)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: userId,
            instance: instanceRef,
            userName: 'demo@example.com',
            displayName: 'Demo User',
            email: 'demo@example.com',
          });

        // mock create response
        mockSend.mockResolvedValue({ UserId: userId });

        const result = await setSsoUser(
          {
            findsert: {
              instance: instanceRef,
              userName: 'demo@example.com',
              displayName: 'Demo User',
              email: 'demo@example.com',
            },
          },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(expect.any(CreateUserCommand));
        expect(result.id).toBe(userId);
      });
    });

    when('findsert is called with name fields', () => {
      then('it should create user with given and family name', async () => {
        const userId = 'user-uuid-1234';

        (getModule.getOneSsoUser as jest.Mock)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: userId,
            instance: instanceRef,
            userName: 'demo@example.com',
            displayName: 'Demo User',
            email: 'demo@example.com',
            givenName: 'Demo',
            familyName: 'User',
          });

        mockSend.mockResolvedValue({ UserId: userId });

        const result = await setSsoUser(
          {
            findsert: {
              instance: instanceRef,
              userName: 'demo@example.com',
              displayName: 'Demo User',
              email: 'demo@example.com',
              givenName: 'Demo',
              familyName: 'User',
            },
          },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(expect.any(CreateUserCommand));
        expect(result.givenName).toBe('Demo');
        expect(result.familyName).toBe('User');
      });
    });
  });

  given('a user that already exists', () => {
    when('findsert is called', () => {
      then('it should return the existing user (idempotent)', async () => {
        const userId = 'user-uuid-1234';
        const existing = {
          id: userId,
          instance: instanceRef,
          userName: 'demo@example.com',
          displayName: 'Demo User',
          email: 'demo@example.com',
        };

        (getModule.getOneSsoUser as jest.Mock).mockResolvedValue(existing);

        const result = await setSsoUser(
          {
            findsert: {
              instance: instanceRef,
              userName: 'demo@example.com',
              displayName: 'Demo User',
              email: 'demo@example.com',
            },
          },
          context,
        );

        expect(mockSend).not.toHaveBeenCalledWith(
          expect.any(CreateUserCommand),
        );
        expect(result).toEqual(existing);
      });
    });

    when('upsert is called with different display name', () => {
      then('it should update the display name', async () => {
        const userId = 'user-uuid-1234';
        const existing = {
          id: userId,
          instance: instanceRef,
          userName: 'demo@example.com',
          displayName: 'Old Name',
          email: 'demo@example.com',
        };

        (getModule.getOneSsoUser as jest.Mock)
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce({
            ...existing,
            displayName: 'New Name',
          });

        mockSend.mockResolvedValue({});

        const result = await setSsoUser(
          {
            upsert: {
              instance: instanceRef,
              userName: 'demo@example.com',
              displayName: 'New Name',
              email: 'demo@example.com',
            },
          },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(expect.any(UpdateUserCommand));
        expect(result.displayName).toBe('New Name');
      });
    });

    when('upsert is called with different given name', () => {
      then('it should update the given name', async () => {
        const userId = 'user-uuid-1234';
        const existing = {
          id: userId,
          instance: instanceRef,
          userName: 'demo@example.com',
          displayName: 'Demo User',
          email: 'demo@example.com',
          givenName: 'Demo',
          familyName: 'User',
        };

        (getModule.getOneSsoUser as jest.Mock)
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce({
            ...existing,
            givenName: 'NewGiven',
          });

        mockSend.mockResolvedValue({});

        const result = await setSsoUser(
          {
            upsert: {
              instance: instanceRef,
              userName: 'demo@example.com',
              displayName: 'Demo User',
              email: 'demo@example.com',
              givenName: 'NewGiven',
              familyName: 'User',
            },
          },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(expect.any(UpdateUserCommand));
        expect(result.givenName).toBe('NewGiven');
      });
    });

    when('upsert is called with same values', () => {
      then('it should not call update', async () => {
        const userId = 'user-uuid-1234';
        const existing = {
          id: userId,
          instance: instanceRef,
          userName: 'demo@example.com',
          displayName: 'Demo User',
          email: 'demo@example.com',
        };

        (getModule.getOneSsoUser as jest.Mock)
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce(existing);

        const result = await setSsoUser(
          {
            upsert: {
              instance: instanceRef,
              userName: 'demo@example.com',
              displayName: 'Demo User',
              email: 'demo@example.com',
            },
          },
          context,
        );

        expect(mockSend).not.toHaveBeenCalledWith(
          expect.any(UpdateUserCommand),
        );
        expect(result).toEqual(existing);
      });
    });
  });
});
