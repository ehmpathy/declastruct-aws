import {
  CreateAccountAssignmentCommand,
  SSOAdminClient,
} from '@aws-sdk/client-sso-admin';
import { given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';
import * as getRefByPrimaryOfOrganizationAccountModule from '@src/domain.operations/organizationAccount/getRefByPrimaryOfOrganizationAccount';
import * as ssoInstanceModule from '@src/domain.operations/ssoInstance/getOneSsoInstance';
import * as getRefByPrimaryOfSsoPermissionSetModule from '@src/domain.operations/ssoPermissionSet/getRefByPrimaryOfSsoPermissionSet';
import * as getRefByPrimaryOfSsoUserModule from '@src/domain.operations/ssoUser/getRefByPrimaryOfSsoUser';

import * as getModule from './getOneSsoAccountAssignment';
import { setSsoAccountAssignment } from './setSsoAccountAssignment';

jest.mock('@aws-sdk/client-sso-admin');
jest.mock('./getOneSsoAccountAssignment');
jest.mock('../ssoInstance/getOneSsoInstance');
jest.mock('../ssoPermissionSet/getRefByPrimaryOfSsoPermissionSet');
jest.mock('../ssoUser/getRefByPrimaryOfSsoUser');
jest.mock('../organizationAccount/getRefByPrimaryOfOrganizationAccount');

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

describe('setSsoAccountAssignment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ssoInstanceModule.getOneSsoInstance as jest.Mock).mockResolvedValue(
      mockInstance,
    );

    // mock ref resolvers to return primary refs
    (
      getRefByPrimaryOfSsoPermissionSetModule.getRefByPrimaryOfSsoPermissionSet as jest.Mock
    ).mockImplementation(async (input) => ({
      arn: 'arn:aws:sso:::permissionSet/ssoins-1234567890abcdef/ps-resolved',
    }));

    (
      getRefByPrimaryOfSsoUserModule.getRefByPrimaryOfSsoUser as jest.Mock
    ).mockImplementation(async (input) => ({
      id: 'resolved-user-id',
    }));

    (
      getRefByPrimaryOfOrganizationAccountModule.getRefByPrimaryOfOrganizationAccount as jest.Mock
    ).mockImplementation(async (input) => {
      if (input.ref.id) return { id: input.ref.id };
      return { id: 'resolved-account-id' };
    });
  });

  given('an account assignment that does not exist', () => {
    when('findsert is called', () => {
      then('it should create the assignment', async () => {
        const permissionSetArn =
          'arn:aws:sso:::permissionSet/ssoins-1234567890abcdef/ps-abcdef1234567890';
        const principalId = 'user-uuid-1234';
        const accountId = '123456789012';

        // mock lookup returns null (not found)
        (getModule.getOneSsoAccountAssignment as jest.Mock)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            instance: instanceRef,
            permissionSet: { instance: instanceRef, name: 'TestAccess' },
            principalType: 'USER',
            principal: { instance: instanceRef, userName: 'test-user' },
            targetType: 'AWS_ACCOUNT',
            target: { email: 'test@example.com' },
          });

        // mock create response
        mockSend.mockResolvedValue({
          AccountAssignmentCreationStatus: {
            Status: 'SUCCEEDED',
          },
        });

        const result = await setSsoAccountAssignment(
          {
            findsert: {
              instance: instanceRef,
              permissionSet: { instance: instanceRef, name: 'TestAccess' },
              principalType: 'USER',
              principal: { instance: instanceRef, userName: 'test-user' },
              targetType: 'AWS_ACCOUNT',
              target: { email: 'test@example.com' },
            },
          },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(
          expect.any(CreateAccountAssignmentCommand),
        );
        expect(result.principalType).toBe('USER');
        expect(result.target).toEqual({ email: 'test@example.com' });
      });
    });

    when('findsert is called with GROUP principal', () => {
      then('it should create group assignment', async () => {
        const accountId = '123456789012';

        (getModule.getOneSsoAccountAssignment as jest.Mock)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            instance: instanceRef,
            permissionSet: { instance: instanceRef, name: 'GroupAccess' },
            principalType: 'GROUP',
            principal: { instance: instanceRef, userName: 'test-group' },
            targetType: 'AWS_ACCOUNT',
            target: { email: 'test@example.com' },
          });

        mockSend.mockResolvedValue({
          AccountAssignmentCreationStatus: { Status: 'SUCCEEDED' },
        });

        const result = await setSsoAccountAssignment(
          {
            findsert: {
              instance: instanceRef,
              permissionSet: { instance: instanceRef, name: 'GroupAccess' },
              principalType: 'GROUP',
              principal: { instance: instanceRef, userName: 'test-group' },
              targetType: 'AWS_ACCOUNT',
              target: { email: 'test@example.com' },
            },
          },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(
          expect.any(CreateAccountAssignmentCommand),
        );
        expect(result.principalType).toBe('GROUP');
      });
    });
  });

  given('an account assignment that already exists', () => {
    when('findsert is called', () => {
      then(
        'it should return the existing assignment (idempotent)',
        async () => {
          const existing = {
            instance: instanceRef,
            permissionSet: { instance: instanceRef, name: 'TestAccess' },
            principalType: 'USER' as const,
            principal: { instance: instanceRef, userName: 'test-user' },
            targetType: 'AWS_ACCOUNT' as const,
            target: { email: 'test@example.com' },
          };

          (getModule.getOneSsoAccountAssignment as jest.Mock).mockResolvedValue(
            existing,
          );

          const result = await setSsoAccountAssignment(
            {
              findsert: {
                instance: instanceRef,
                permissionSet: { instance: instanceRef, name: 'TestAccess' },
                principalType: 'USER',
                principal: { instance: instanceRef, userName: 'test-user' },
                targetType: 'AWS_ACCOUNT',
                target: { email: 'test@example.com' },
              },
            },
            context,
          );

          expect(mockSend).not.toHaveBeenCalledWith(
            expect.any(CreateAccountAssignmentCommand),
          );
          expect(result).toEqual(existing);
        },
      );
    });
  });

  given('an assignment with target as organization account ref', () => {
    when('findsert is called', () => {
      then('it should resolve target account id', async () => {
        (getModule.getOneSsoAccountAssignment as jest.Mock)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            instance: instanceRef,
            permissionSet: { instance: instanceRef, name: 'TestAccess' },
            principalType: 'USER',
            principal: { instance: instanceRef, userName: 'test-user' },
            targetType: 'AWS_ACCOUNT',
            target: { email: 'test@example.com' },
          });

        mockSend.mockResolvedValue({
          AccountAssignmentCreationStatus: { Status: 'SUCCEEDED' },
        });

        const result = await setSsoAccountAssignment(
          {
            findsert: {
              instance: instanceRef,
              permissionSet: { instance: instanceRef, name: 'TestAccess' },
              principalType: 'USER',
              principal: { instance: instanceRef, userName: 'test-user' },
              targetType: 'AWS_ACCOUNT',
              target: { email: 'test@example.com' }, // ref by unique
            },
          },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(
          expect.any(CreateAccountAssignmentCommand),
        );
        expect(result).not.toBeNull();
      });
    });
  });
});
