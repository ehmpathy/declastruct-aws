import {
  ListPoliciesForTargetCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import * as getOneAccountModule from '../organizationAccount/getOneOrganizationAccount';
import * as getOnePolicyModule from '../organizationServiceControlPolicy/getOneOrganizationServiceControlPolicy';
import { getOneOrganizationServiceControlPolicyAttachment } from './getOneOrganizationServiceControlPolicyAttachment';

jest.mock('@aws-sdk/client-organizations');
jest.mock('../organizationAccount/getOneOrganizationAccount');
jest.mock(
  '../organizationServiceControlPolicy/getOneOrganizationServiceControlPolicy',
);

const mockSend = jest.fn();
(OrganizationsClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

const samplePolicy = {
  id: 'p-abc123',
  name: 'deny-dangerous-actions',
  description: 'blocks exfiltration vectors',
  content: { statements: [] },
  tags: null,
};

const sampleAccount = {
  id: '123456789012',
  email: 'prod@example.com',
  name: 'prod-account',
  status: 'ACTIVE',
};

describe('getOneOrganizationServiceControlPolicyAttachment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({});
  });

  given('an attachment exists', () => {
    then('we should return the attachment', async () => {
      (
        getOnePolicyModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);

      mockSend.mockImplementation((command) => {
        if (command instanceof ListPoliciesForTargetCommand) {
          return Promise.resolve({
            Policies: [{ Id: 'p-abc123', Name: 'deny-dangerous-actions' }],
          });
        }
        return Promise.resolve({});
      });

      const result = await getOneOrganizationServiceControlPolicyAttachment(
        {
          by: {
            unique: {
              policy: { name: 'deny-dangerous-actions' },
              target: { id: '123456789012' },
            },
          },
        },
        context,
      );

      expect(result).not.toBeNull();
      expect(result?.policy.name).toBe('deny-dangerous-actions');
      expect((result?.target as { id: string }).id).toBe('123456789012');
    });

    then(
      'we should return the attachment when target is by email',
      async () => {
        (
          getOnePolicyModule.getOneOrganizationServiceControlPolicy as jest.Mock
        ).mockResolvedValue(samplePolicy);
        (
          getOneAccountModule.getOneOrganizationAccount as jest.Mock
        ).mockResolvedValue(sampleAccount);

        mockSend.mockImplementation((command) => {
          if (command instanceof ListPoliciesForTargetCommand) {
            return Promise.resolve({
              Policies: [{ Id: 'p-abc123', Name: 'deny-dangerous-actions' }],
            });
          }
          return Promise.resolve({});
        });

        const result = await getOneOrganizationServiceControlPolicyAttachment(
          {
            by: {
              unique: {
                policy: { name: 'deny-dangerous-actions' },
                target: { email: 'prod@example.com' },
              },
            },
          },
          context,
        );

        expect(result).not.toBeNull();
        expect(result?.policy.name).toBe('deny-dangerous-actions');
      },
    );
  });

  given('an attachment does not exist', () => {
    then('we should return null if policy not found', async () => {
      (
        getOnePolicyModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(null);

      const result = await getOneOrganizationServiceControlPolicyAttachment(
        {
          by: {
            unique: {
              policy: { name: 'nonexistent-policy' },
              target: { id: '123456789012' },
            },
          },
        },
        context,
      );

      expect(result).toBeNull();
    });

    then('we should return null if account not found', async () => {
      (
        getOnePolicyModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);
      (
        getOneAccountModule.getOneOrganizationAccount as jest.Mock
      ).mockResolvedValue(null);

      const result = await getOneOrganizationServiceControlPolicyAttachment(
        {
          by: {
            unique: {
              policy: { name: 'deny-dangerous-actions' },
              target: { email: 'nonexistent@example.com' },
            },
          },
        },
        context,
      );

      expect(result).toBeNull();
    });

    then('we should return null if policy not attached', async () => {
      (
        getOnePolicyModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);

      mockSend.mockImplementation((command) => {
        if (command instanceof ListPoliciesForTargetCommand) {
          return Promise.resolve({
            Policies: [{ Id: 'p-other999', Name: 'other-policy' }],
          });
        }
        return Promise.resolve({});
      });

      const result = await getOneOrganizationServiceControlPolicyAttachment(
        {
          by: {
            unique: {
              policy: { name: 'deny-dangerous-actions' },
              target: { id: '123456789012' },
            },
          },
        },
        context,
      );

      expect(result).toBeNull();
    });
  });

  given('TargetNotFoundException is thrown', () => {
    then('we should return null', async () => {
      (
        getOnePolicyModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);

      mockSend.mockImplementation((command) => {
        if (command instanceof ListPoliciesForTargetCommand) {
          const error = new Error('Target not found');
          error.name = 'TargetNotFoundException';
          return Promise.reject(error);
        }
        return Promise.resolve({});
      });

      const result = await getOneOrganizationServiceControlPolicyAttachment(
        {
          by: {
            unique: {
              policy: { name: 'deny-dangerous-actions' },
              target: { id: '999999999999' },
            },
          },
        },
        context,
      );

      expect(result).toBeNull();
    });
  });

  given('an unexpected error occurs', () => {
    then('we should throw a HelpfulError', async () => {
      (
        getOnePolicyModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);

      const error = new Error('Some unexpected error');
      error.name = 'InternalServerError';
      mockSend.mockRejectedValue(error);

      await expect(
        getOneOrganizationServiceControlPolicyAttachment(
          {
            by: {
              unique: {
                policy: { name: 'deny-dangerous-actions' },
                target: { id: '123456789012' },
              },
            },
          },
          context,
        ),
      ).rejects.toThrow(
        'aws.getOneOrganizationServiceControlPolicyAttachment error',
      );
    });
  });
});
