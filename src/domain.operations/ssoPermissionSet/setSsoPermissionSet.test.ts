import {
  AttachManagedPolicyToPermissionSetCommand,
  CreatePermissionSetCommand,
  DetachManagedPolicyFromPermissionSetCommand,
  PutInlinePolicyToPermissionSetCommand,
  SSOAdminClient,
  UpdatePermissionSetCommand,
} from '@aws-sdk/client-sso-admin';
import { given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';
import * as ssoInstanceModule from '@src/domain.operations/ssoInstance/getOneSsoInstance';

import * as getModule from './getOneSsoPermissionSet';
import { setSsoPermissionSet } from './setSsoPermissionSet';

jest.mock('@aws-sdk/client-sso-admin');
jest.mock('./getOneSsoPermissionSet');
jest.mock('../ssoInstance/getOneSsoInstance');

const mockSend = jest.fn();
(SSOAdminClient as jest.Mock).mockImplementation(() => ({
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

describe('setSsoPermissionSet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ssoInstanceModule.getOneSsoInstance as jest.Mock).mockResolvedValue(
      mockInstance,
    );
  });

  given('a permission set that does not exist', () => {
    when('findsert is called', () => {
      then('it should create the permission set', async () => {
        const permissionSetArn =
          'arn:aws:sso:::permissionSet/ssoins-1234567890abcdef/ps-abcdef1234567890';

        // mock lookup returns null (not found)
        (getModule.getOneSsoPermissionSet as jest.Mock)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            arn: permissionSetArn,
            instance: instanceRef,
            name: 'DemoAccess',
            description: 'Demo access permission set',
            sessionDuration: 'PT1H',
            policy: { managed: [], inline: { statements: [] } },
            tags: {},
          });

        // mock create response
        mockSend.mockResolvedValue({
          PermissionSet: { PermissionSetArn: permissionSetArn },
        });

        const result = await setSsoPermissionSet(
          {
            findsert: {
              instance: instanceRef,
              name: 'DemoAccess',
              description: 'Demo access permission set',
              sessionDuration: 'PT1H',
              policy: { managed: [], inline: { statements: [] } },
              tags: {},
            },
          },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(
          expect.any(CreatePermissionSetCommand),
        );
        expect(result.arn).toBe(permissionSetArn);
      });
    });

    when('findsert is called with managed policies', () => {
      then(
        'it should create the permission set and attach policies',
        async () => {
          const permissionSetArn =
            'arn:aws:sso:::permissionSet/ssoins-1234567890abcdef/ps-abcdef1234567890';

          (getModule.getOneSsoPermissionSet as jest.Mock)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({
              arn: permissionSetArn,
              instance: instanceRef,
              name: 'AdminAccess',
              policy: {
                managed: ['arn:aws:iam::aws:policy/AdministratorAccess'],
                inline: { statements: [] },
              },
            });

          mockSend.mockResolvedValue({
            PermissionSet: { PermissionSetArn: permissionSetArn },
          });

          await setSsoPermissionSet(
            {
              findsert: {
                instance: instanceRef,
                name: 'AdminAccess',
                description: null,
                policy: {
                  managed: ['arn:aws:iam::aws:policy/AdministratorAccess'],
                  inline: { statements: [] },
                },
                tags: null,
              },
            },
            context,
          );

          expect(mockSend).toHaveBeenCalledWith(
            expect.any(CreatePermissionSetCommand),
          );
          expect(mockSend).toHaveBeenCalledWith(
            expect.any(AttachManagedPolicyToPermissionSetCommand),
          );
        },
      );
    });
  });

  given('a permission set that already exists', () => {
    when('findsert is called', () => {
      then(
        'it should return the existing permission set (idempotent)',
        async () => {
          const permissionSetArn =
            'arn:aws:sso:::permissionSet/ssoins-1234567890abcdef/ps-abcdef1234567890';
          const existing = {
            arn: permissionSetArn,
            instance: instanceRef,
            name: 'DemoAccess',
            description: 'Demo access',
            sessionDuration: 'PT1H',
            policy: { managed: [], inline: { statements: [] } },
            tags: {},
          };

          (getModule.getOneSsoPermissionSet as jest.Mock).mockResolvedValue(
            existing,
          );

          const result = await setSsoPermissionSet(
            {
              findsert: {
                instance: instanceRef,
                name: 'DemoAccess',
                description: 'Demo access',
                policy: { managed: [], inline: { statements: [] } },
                tags: null,
              },
            },
            context,
          );

          expect(mockSend).not.toHaveBeenCalledWith(
            expect.any(CreatePermissionSetCommand),
          );
          expect(result).toEqual(existing);
        },
      );
    });

    when('upsert is called with different description', () => {
      then('it should update the permission set', async () => {
        const permissionSetArn =
          'arn:aws:sso:::permissionSet/ssoins-1234567890abcdef/ps-abcdef1234567890';
        const existing = {
          arn: permissionSetArn,
          instance: instanceRef,
          name: 'DemoAccess',
          description: 'Old description',
          sessionDuration: 'PT1H',
          policy: { managed: [], inline: { statements: [] } },
          tags: {},
        };

        (getModule.getOneSsoPermissionSet as jest.Mock)
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce({
            ...existing,
            description: 'New description',
          });

        mockSend.mockResolvedValue({});

        const result = await setSsoPermissionSet(
          {
            upsert: {
              instance: instanceRef,
              name: 'DemoAccess',
              description: 'New description',
              sessionDuration: 'PT1H',
              policy: { managed: [], inline: { statements: [] } },
              tags: null,
            },
          },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(
          expect.any(UpdatePermissionSetCommand),
        );
        expect(result.description).toBe('New description');
      });
    });

    when('upsert is called with policy changes', () => {
      then('it should update the managed policies', async () => {
        const permissionSetArn =
          'arn:aws:sso:::permissionSet/ssoins-1234567890abcdef/ps-abcdef1234567890';
        const existing = {
          arn: permissionSetArn,
          instance: instanceRef,
          name: 'DemoAccess',
          description: 'Demo',
          sessionDuration: 'PT1H',
          policy: {
            managed: ['arn:aws:iam::aws:policy/ReadOnlyAccess'],
            inline: { statements: [] },
          },
          tags: {},
        };

        (getModule.getOneSsoPermissionSet as jest.Mock)
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce({
            ...existing,
            policy: {
              managed: ['arn:aws:iam::aws:policy/AdministratorAccess'],
              inline: { statements: [] },
            },
          });

        mockSend.mockResolvedValue({});

        await setSsoPermissionSet(
          {
            upsert: {
              instance: instanceRef,
              name: 'DemoAccess',
              description: 'Demo',
              sessionDuration: 'PT1H',
              policy: {
                managed: ['arn:aws:iam::aws:policy/AdministratorAccess'],
                inline: { statements: [] },
              },
              tags: null,
            },
          },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(
          expect.any(DetachManagedPolicyFromPermissionSetCommand),
        );
        expect(mockSend).toHaveBeenCalledWith(
          expect.any(AttachManagedPolicyToPermissionSetCommand),
        );
      });
    });

    when('upsert is called with inline policy', () => {
      then('it should put the inline policy', async () => {
        const permissionSetArn =
          'arn:aws:sso:::permissionSet/ssoins-1234567890abcdef/ps-abcdef1234567890';
        const existing = {
          arn: permissionSetArn,
          instance: instanceRef,
          name: 'DemoAccess',
          description: 'Demo',
          sessionDuration: 'PT1H',
          policy: { managed: [], inline: { statements: [] } },
          tags: {},
        };

        (getModule.getOneSsoPermissionSet as jest.Mock)
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce({
            ...existing,
            policy: {
              managed: [],
              inline: {
                statements: [
                  { effect: 'Allow', action: 's3:GetObject', resource: '*' },
                ],
              },
            },
          });

        mockSend.mockResolvedValue({});

        await setSsoPermissionSet(
          {
            upsert: {
              instance: instanceRef,
              name: 'DemoAccess',
              description: 'Demo',
              sessionDuration: 'PT1H',
              policy: {
                managed: [],
                inline: {
                  statements: [
                    { effect: 'Allow', action: 's3:GetObject', resource: '*' },
                  ],
                },
              },
              tags: null,
            },
          },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(
          expect.any(PutInlinePolicyToPermissionSetCommand),
        );
      });
    });
  });
});
