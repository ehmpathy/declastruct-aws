import {
  ListInstancesCommand,
  SSOAdminClient,
} from '@aws-sdk/client-sso-admin';
import { given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import { getOneSsoInstance } from './getOneSsoInstance';

jest.mock('@aws-sdk/client-sso-admin');

const mockSend = jest.fn();
(SSOAdminClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

describe('getOneSsoInstance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('an account with identity center enabled', () => {
    when('getOneSsoInstance is called by auth', () => {
      then('it should return the instance details', async () => {
        mockSend.mockResolvedValue({
          Instances: [
            {
              InstanceArn: 'arn:aws:sso:::instance/ssoins-1234567890abcdef',
              IdentityStoreId: 'd-1234567890',
              OwnerAccountId: '123456789012',
              Name: 'Test Instance',
              Status: 'ACTIVE',
              StatusReason: null,
              CreatedDate: new Date('2024-01-01T00:00:00Z'),
            },
          ],
        });

        const result = await getOneSsoInstance({ by: { auth: true } }, context);

        expect(mockSend).toHaveBeenCalledWith(expect.any(ListInstancesCommand));
        expect(result).toMatchObject({
          arn: 'arn:aws:sso:::instance/ssoins-1234567890abcdef',
          identityStoreId: 'd-1234567890',
          ownerAccount: { id: '123456789012' },
        });
      });
    });

    when('getOneSsoInstance is called by unique (ownerAccount)', () => {
      then('it should return the matching instance', async () => {
        mockSend.mockResolvedValue({
          Instances: [
            {
              InstanceArn: 'arn:aws:sso:::instance/ssoins-1234567890abcdef',
              IdentityStoreId: 'd-1234567890',
              OwnerAccountId: '123456789012',
              Status: 'ACTIVE',
              StatusReason: null,
              CreatedDate: new Date('2024-01-01T00:00:00Z'),
            },
          ],
        });

        const result = await getOneSsoInstance(
          { by: { unique: { ownerAccount: { id: '123456789012' } } } },
          context,
        );

        expect(result?.ownerAccount.id).toBe('123456789012');
      });
    });

    when('getOneSsoInstance is called by primary (arn)', () => {
      then('it should return the matching instance', async () => {
        const expectedArn = 'arn:aws:sso:::instance/ssoins-1234567890abcdef';
        mockSend.mockResolvedValue({
          Instances: [
            {
              InstanceArn: expectedArn,
              IdentityStoreId: 'd-1234567890',
              OwnerAccountId: '123456789012',
              Status: 'ACTIVE',
              StatusReason: null,
              CreatedDate: new Date('2024-01-01T00:00:00Z'),
            },
          ],
        });

        const result = await getOneSsoInstance(
          { by: { primary: { arn: expectedArn } } },
          context,
        );

        expect(result?.arn).toBe(expectedArn);
      });
    });
  });

  given('an account without identity center enabled', () => {
    when('getOneSsoInstance is called', () => {
      then('it should return null', async () => {
        mockSend.mockResolvedValue({ Instances: [] });

        const result = await getOneSsoInstance({ by: { auth: true } }, context);

        expect(result).toBeNull();
      });
    });
  });

  given('an account with multiple sso instances', () => {
    when('getOneSsoInstance is called by auth', () => {
      then('it should throw an error', async () => {
        mockSend.mockResolvedValue({
          Instances: [
            {
              InstanceArn: 'arn:aws:sso:::instance/ssoins-1111111111111111',
              IdentityStoreId: 'd-1111111111',
              OwnerAccountId: '111111111111',
            },
            {
              InstanceArn: 'arn:aws:sso:::instance/ssoins-2222222222222222',
              IdentityStoreId: 'd-2222222222',
              OwnerAccountId: '222222222222',
            },
          ],
        });

        await expect(
          getOneSsoInstance({ by: { auth: true } }, context),
        ).rejects.toThrow('multiple sso instances found');
      });
    });
  });

  given('an instance lookup by unique that does not match', () => {
    when('getOneSsoInstance is called', () => {
      then('it should return null', async () => {
        mockSend.mockResolvedValue({
          Instances: [
            {
              InstanceArn: 'arn:aws:sso:::instance/ssoins-1234567890abcdef',
              IdentityStoreId: 'd-1234567890',
              OwnerAccountId: '123456789012',
              Status: 'ACTIVE',
              StatusReason: null,
              CreatedDate: new Date('2024-01-01T00:00:00Z'),
            },
          ],
        });

        const result = await getOneSsoInstance(
          { by: { unique: { ownerAccount: { id: '999999999999' } } } },
          context,
        );

        expect(result).toBeNull();
      });
    });
  });
});
