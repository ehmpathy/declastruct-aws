import {
  DescribePermissionSetCommand,
  ListPermissionSetsCommand,
  SSOAdminClient,
} from '@aws-sdk/client-sso-admin';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '../../.test/getMockedAwsApiContext';
import * as ssoInstanceModule from '../ssoInstance/getOneSsoInstance';
import { getOneSsoPermissionSet } from './getOneSsoPermissionSet';

jest.mock('@aws-sdk/client-sso-admin');
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

describe('getOneSsoPermissionSet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ssoInstanceModule.getOneSsoInstance as jest.Mock).mockResolvedValue(
      mockInstance,
    );
  });

  given('a permission set ref by unique', () => {
    then('we should list and find matching name', async () => {
      const permissionSetArn =
        'arn:aws:sso:::permissionSet/ssoins-1234567890abcdef/ps-abcdef1234567890';

      // mock all responses - implementation uses getAllSsoPermissionSets which:
      // 1. calls ListPermissionSetsCommand
      // 2. for each permission set, calls 4 commands in parallel via Promise.all
      mockSend.mockResolvedValue({
        // for ListPermissionSetsCommand
        PermissionSets: [permissionSetArn],
        // for DescribePermissionSetCommand
        PermissionSet: {
          PermissionSetArn: permissionSetArn,
          Name: 'AdministratorAccess',
          Description: 'Full admin access',
          SessionDuration: 'PT4H',
        },
        // for ListManagedPoliciesInPermissionSetCommand
        AttachedManagedPolicies: [
          { Arn: 'arn:aws:iam::aws:policy/AdministratorAccess' },
        ],
        // for GetInlinePolicyForPermissionSetCommand
        InlinePolicy: null,
        // for ListTagsForResourceCommand
        Tags: [],
      });

      const result = await getOneSsoPermissionSet(
        {
          by: {
            unique: { instance: instanceRef, name: 'AdministratorAccess' },
          },
        },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(ListPermissionSetsCommand),
      );
      expect(result).not.toBeNull();
      expect(result?.name).toBe('AdministratorAccess');
    });
  });

  given('a permission set ref by primary', () => {
    then('we should describe by arn', async () => {
      const permissionSetArn =
        'arn:aws:sso:::permissionSet/ssoins-1234567890abcdef/ps-abcdef1234567890';

      // mock all responses - return same response for any command
      // since we're fetching via Promise.all, all 4 calls happen in parallel
      mockSend.mockResolvedValue({
        // for DescribePermissionSetCommand
        PermissionSet: {
          PermissionSetArn: permissionSetArn,
          Name: 'AdministratorAccess',
          Description: 'Full admin access',
          SessionDuration: 'PT4H',
        },
        // for ListManagedPoliciesInPermissionSetCommand
        AttachedManagedPolicies: [
          { Arn: 'arn:aws:iam::aws:policy/AdministratorAccess' },
        ],
        // for GetInlinePolicyForPermissionSetCommand
        InlinePolicy: null,
        // for ListTagsForResourceCommand
        Tags: [],
      });

      const result = await getOneSsoPermissionSet(
        { by: { primary: { arn: permissionSetArn } } },
        context,
      );

      // verify getOneSsoInstance was called
      expect(ssoInstanceModule.getOneSsoInstance).toHaveBeenCalled();
      expect(mockSend).toHaveBeenCalledWith(
        expect.any(DescribePermissionSetCommand),
      );
      expect(result).not.toBeNull();
    });
  });

  given('a permission set that does not exist', () => {
    then('we should return null for empty list', async () => {
      mockSend.mockResolvedValueOnce({ PermissionSets: [] });

      const result = await getOneSsoPermissionSet(
        { by: { unique: { instance: instanceRef, name: 'NonexistentSet' } } },
        context,
      );

      expect(result).toBeNull();
    });

    then('we should return null for ResourceNotFoundException', async () => {
      const permissionSetArn =
        'arn:aws:sso:::permissionSet/ssoins-1234567890abcdef/ps-nonexistent';

      const error = new Error('Permission set not found');
      error.name = 'ResourceNotFoundException';
      mockSend.mockRejectedValue(error);

      const result = await getOneSsoPermissionSet(
        { by: { primary: { arn: permissionSetArn } } },
        context,
      );

      expect(result).toBeNull();
    });
  });

  given('a permission set with inline policy', () => {
    then('we should parse the inline policy', async () => {
      const permissionSetArn =
        'arn:aws:sso:::permissionSet/ssoins-1234567890abcdef/ps-abcdef1234567890';

      // mock all responses (called in parallel via Promise.all)
      // use constructor.name check since instanceof doesn't work with jest mocked modules
      mockSend.mockImplementation((command) => {
        const commandName = command.constructor.name;
        if (commandName === 'DescribePermissionSetCommand') {
          return Promise.resolve({
            PermissionSet: {
              PermissionSetArn: permissionSetArn,
              Name: 'CustomAccess',
              SessionDuration: 'PT1H',
            },
          });
        }
        if (commandName === 'ListManagedPoliciesInPermissionSetCommand') {
          return Promise.resolve({ AttachedManagedPolicies: [] });
        }
        if (commandName === 'GetInlinePolicyForPermissionSetCommand') {
          return Promise.resolve({
            InlinePolicy: JSON.stringify({
              Statement: [
                {
                  Effect: 'Allow',
                  Action: 's3:GetObject',
                  Resource: 'arn:aws:s3:::bucket/*',
                },
              ],
            }),
          });
        }
        if (commandName === 'ListTagsForResourceCommand') {
          return Promise.resolve({ Tags: [] });
        }
        return Promise.resolve({});
      });

      const result = await getOneSsoPermissionSet(
        { by: { primary: { arn: permissionSetArn } } },
        context,
      );

      expect(result).not.toBeNull();
      expect(result?.policy.inline.statements).toHaveLength(1);
      expect(result?.policy.inline.statements[0]).toMatchObject({
        effect: 'Allow',
        action: 's3:GetObject',
      });
    });
  });
});
