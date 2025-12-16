import {
  ListAccountAssignmentsCommand,
  SSOAdminClient,
} from '@aws-sdk/client-sso-admin';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';
import * as getRefByPrimaryOfOrganizationAccountModule from '@src/domain.operations/organizationAccount/getRefByPrimaryOfOrganizationAccount';
import * as ssoInstanceModule from '@src/domain.operations/ssoInstance/getOneSsoInstance';
import * as getRefByPrimaryOfSsoPermissionSetModule from '@src/domain.operations/ssoPermissionSet/getRefByPrimaryOfSsoPermissionSet';
import * as getRefByPrimaryOfSsoUserModule from '@src/domain.operations/ssoUser/getRefByPrimaryOfSsoUser';

import * as castModule from './castIntoDeclaredAwsSsoAccountAssignment';
import { getOneSsoAccountAssignment } from './getOneSsoAccountAssignment';

jest.mock('@aws-sdk/client-sso-admin');
jest.mock('./castIntoDeclaredAwsSsoAccountAssignment');
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

describe('getOneSsoAccountAssignment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ssoInstanceModule.getOneSsoInstance as jest.Mock).mockResolvedValue(
      mockInstance,
    );

    // mock ref resolvers to return primary refs
    // NOTE: these default mocks may be overridden in individual tests
    (
      getRefByPrimaryOfSsoPermissionSetModule.getRefByPrimaryOfSsoPermissionSet as jest.Mock
    ).mockResolvedValue({
      arn: 'arn:aws:sso:::permissionSet/ssoins-1234567890abcdef/ps-resolved',
    });

    (
      getRefByPrimaryOfSsoUserModule.getRefByPrimaryOfSsoUser as jest.Mock
    ).mockResolvedValue({ id: 'resolved-user-id' });

    (
      getRefByPrimaryOfOrganizationAccountModule.getRefByPrimaryOfOrganizationAccount as jest.Mock
    ).mockResolvedValue({ id: '123456789012' });
  });

  given('an account assignment lookup by composite key', () => {
    then('we should find and return the matching assignment', async () => {
      const permissionSetArn =
        'arn:aws:sso:::permissionSet/ssoins-1234567890abcdef/ps-abcdef1234567890';
      const principalId = 'user-uuid-1234';
      const accountId = '123456789012';

      // mock resolvers to return specific ids that match the response
      (
        getRefByPrimaryOfSsoPermissionSetModule.getRefByPrimaryOfSsoPermissionSet as jest.Mock
      ).mockResolvedValue({ arn: permissionSetArn });
      (
        getRefByPrimaryOfSsoUserModule.getRefByPrimaryOfSsoUser as jest.Mock
      ).mockResolvedValue({ id: principalId });
      (
        getRefByPrimaryOfOrganizationAccountModule.getRefByPrimaryOfOrganizationAccount as jest.Mock
      ).mockResolvedValue({ id: accountId });

      mockSend.mockResolvedValue({
        AccountAssignments: [
          {
            AccountId: accountId,
            PermissionSetArn: permissionSetArn,
            PrincipalType: 'USER',
            PrincipalId: principalId,
          },
        ],
      });

      (
        castModule.castIntoDeclaredAwsSsoAccountAssignment as jest.Mock
      ).mockReturnValue({
        instance: instanceRef,
        permissionSet: { instance: instanceRef, name: 'TestAccess' },
        principalType: 'USER',
        principal: { instance: instanceRef, userName: 'test-user' },
        targetType: 'AWS_ACCOUNT',
        target: { email: 'test@example.com' },
      });

      const result = await getOneSsoAccountAssignment(
        {
          by: {
            unique: {
              instance: instanceRef,
              permissionSet: { instance: instanceRef, name: 'TestAccess' },
              principalType: 'USER',
              principal: { instance: instanceRef, userName: 'test-user' },
              targetType: 'AWS_ACCOUNT',
              target: { email: 'test@example.com' },
            },
          },
        },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(ListAccountAssignmentsCommand),
      );
      expect(result).not.toBeNull();
      expect(result?.principalType).toBe('USER');
    });
  });

  given('a group principal assignment', () => {
    then('we should find the group assignment', async () => {
      const permissionSetArn =
        'arn:aws:sso:::permissionSet/ssoins-1234567890abcdef/ps-abcdef1234567890';
      const groupId = 'group-uuid-5678';
      const accountId = '123456789012';

      // mock resolvers to return specific ids that match the response
      (
        getRefByPrimaryOfSsoPermissionSetModule.getRefByPrimaryOfSsoPermissionSet as jest.Mock
      ).mockResolvedValue({ arn: permissionSetArn });
      (
        getRefByPrimaryOfSsoUserModule.getRefByPrimaryOfSsoUser as jest.Mock
      ).mockResolvedValue({ id: groupId });
      (
        getRefByPrimaryOfOrganizationAccountModule.getRefByPrimaryOfOrganizationAccount as jest.Mock
      ).mockResolvedValue({ id: accountId });

      mockSend.mockResolvedValue({
        AccountAssignments: [
          {
            AccountId: accountId,
            PermissionSetArn: permissionSetArn,
            PrincipalType: 'GROUP',
            PrincipalId: groupId,
          },
        ],
      });

      (
        castModule.castIntoDeclaredAwsSsoAccountAssignment as jest.Mock
      ).mockReturnValue({
        instance: instanceRef,
        permissionSet: { instance: instanceRef, name: 'GroupAccess' },
        principalType: 'GROUP',
        principal: { instance: instanceRef, userName: 'test-group' },
        targetType: 'AWS_ACCOUNT',
        target: { email: 'test@example.com' },
      });

      const result = await getOneSsoAccountAssignment(
        {
          by: {
            unique: {
              instance: instanceRef,
              permissionSet: { instance: instanceRef, name: 'GroupAccess' },
              principalType: 'GROUP',
              principal: { instance: instanceRef, userName: 'test-group' },
              targetType: 'AWS_ACCOUNT',
              target: { email: 'test@example.com' },
            },
          },
        },
        context,
      );

      expect(result).not.toBeNull();
      expect(result?.principalType).toBe('GROUP');
    });
  });

  given('an assignment that does not exist', () => {
    then('we should return null when not in list', async () => {
      const accountId = '123456789012';

      mockSend.mockResolvedValue({
        AccountAssignments: [],
      });

      const result = await getOneSsoAccountAssignment(
        {
          by: {
            unique: {
              instance: instanceRef,
              permissionSet: {
                instance: instanceRef,
                name: 'NonexistentAccess',
              },
              principalType: 'USER',
              principal: {
                instance: instanceRef,
                userName: 'nonexistent-user',
              },
              targetType: 'AWS_ACCOUNT',
              target: { email: 'test@example.com' },
            },
          },
        },
        context,
      );

      expect(result).toBeNull();
    });

    then('we should return null for ResourceNotFoundException', async () => {
      const accountId = '123456789012';

      const error = new Error('Resource not found');
      error.name = 'ResourceNotFoundException';
      mockSend.mockRejectedValue(error);

      const result = await getOneSsoAccountAssignment(
        {
          by: {
            unique: {
              instance: instanceRef,
              permissionSet: { instance: instanceRef, name: 'TestAccess' },
              principalType: 'USER',
              principal: { instance: instanceRef, userName: 'test-user' },
              targetType: 'AWS_ACCOUNT',
              target: { email: 'test@example.com' },
            },
          },
        },
        context,
      );

      expect(result).toBeNull();
    });
  });

  given('a lookup with unique refs (not primary)', () => {
    then(
      'we should resolve unique permissionSet ref to primary and proceed',
      async () => {
        const principalId = 'user-uuid-1234';
        const accountId = '123456789012';
        const resolvedArn =
          'arn:aws:sso:::permissionSet/ssoins-1234567890abcdef/ps-resolved';

        // mock resolvers to return specific ids that match the response
        (
          getRefByPrimaryOfSsoPermissionSetModule.getRefByPrimaryOfSsoPermissionSet as jest.Mock
        ).mockResolvedValue({ arn: resolvedArn });
        (
          getRefByPrimaryOfSsoUserModule.getRefByPrimaryOfSsoUser as jest.Mock
        ).mockResolvedValue({ id: principalId });
        (
          getRefByPrimaryOfOrganizationAccountModule.getRefByPrimaryOfOrganizationAccount as jest.Mock
        ).mockResolvedValue({ id: accountId });

        mockSend.mockResolvedValue({
          AccountAssignments: [
            {
              AccountId: accountId,
              PermissionSetArn: resolvedArn,
              PrincipalType: 'USER',
              PrincipalId: principalId,
            },
          ],
        });

        (
          castModule.castIntoDeclaredAwsSsoAccountAssignment as jest.Mock
        ).mockReturnValue({
          instance: instanceRef,
          permissionSet: { instance: instanceRef, name: 'SomeName' },
          principalType: 'USER',
          principal: { instance: instanceRef, userName: 'test-user' },
          targetType: 'AWS_ACCOUNT',
          target: { email: 'test@example.com' },
        });

        const result = await getOneSsoAccountAssignment(
          {
            by: {
              unique: {
                instance: instanceRef,
                permissionSet: { instance: instanceRef, name: 'SomeName' },
                principalType: 'USER',
                principal: { instance: instanceRef, userName: 'test-user' },
                targetType: 'AWS_ACCOUNT',
                target: { email: 'test@example.com' },
              },
            },
          },
          context,
        );

        // should have called the resolver
        expect(
          getRefByPrimaryOfSsoPermissionSetModule.getRefByPrimaryOfSsoPermissionSet,
        ).toHaveBeenCalled();

        // should have made the API call with resolved arn
        expect(mockSend).toHaveBeenCalledWith(
          expect.any(ListAccountAssignmentsCommand),
        );
        expect(result).not.toBeNull();
      },
    );

    then(
      'we should resolve unique principal ref to primary and proceed',
      async () => {
        const accountId = '123456789012';
        const resolvedUserId = 'resolved-user-id';
        const resolvedArn =
          'arn:aws:sso:::permissionSet/ssoins-1234567890abcdef/ps-abcdef1234567890';

        mockSend.mockResolvedValue({
          AccountAssignments: [
            {
              AccountId: accountId,
              PermissionSetArn: resolvedArn,
              PrincipalType: 'USER',
              PrincipalId: resolvedUserId,
            },
          ],
        });

        (
          castModule.castIntoDeclaredAwsSsoAccountAssignment as jest.Mock
        ).mockReturnValue({
          instance: instanceRef,
          permissionSet: { instance: instanceRef, name: 'TestAccess' },
          principalType: 'USER',
          principal: { instance: instanceRef, userName: 'user@example.com' },
          targetType: 'AWS_ACCOUNT',
          target: { email: 'test@example.com' },
        });

        const result = await getOneSsoAccountAssignment(
          {
            by: {
              unique: {
                instance: instanceRef,
                permissionSet: { instance: instanceRef, name: 'TestAccess' },
                principalType: 'USER',
                principal: {
                  instance: { ownerAccount: { id: '123456789012' } },
                  userName: 'user@example.com',
                },
                targetType: 'AWS_ACCOUNT',
                target: { email: 'test@example.com' },
              },
            },
          },
          context,
        );

        // should have called the resolver
        expect(
          getRefByPrimaryOfSsoUserModule.getRefByPrimaryOfSsoUser,
        ).toHaveBeenCalled();

        // should have made the API call
        expect(mockSend).toHaveBeenCalledWith(
          expect.any(ListAccountAssignmentsCommand),
        );
        expect(result).not.toBeNull();
      },
    );
  });
});
