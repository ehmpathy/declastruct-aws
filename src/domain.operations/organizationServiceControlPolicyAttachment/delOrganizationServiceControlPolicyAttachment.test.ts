import {
  DetachPolicyCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import * as getOneAccountModule from '../organizationAccount/getOneOrganizationAccount';
import * as getOnePolicyModule from '../organizationServiceControlPolicy/getOneOrganizationServiceControlPolicy';
import { delOrganizationServiceControlPolicyAttachment } from './delOrganizationServiceControlPolicyAttachment';

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

describe('delOrganizationServiceControlPolicyAttachment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({});
  });

  given('an attachment exists', () => {
    then('delete should detach with target id', async () => {
      (
        getOnePolicyModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);

      const result = await delOrganizationServiceControlPolicyAttachment(
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

      expect(mockSend).toHaveBeenCalledWith(expect.any(DetachPolicyCommand));
      expect(result).toEqual({ deleted: true });
    });

    then('delete should detach with target email', async () => {
      (
        getOnePolicyModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);
      (
        getOneAccountModule.getOneOrganizationAccount as jest.Mock
      ).mockResolvedValue(sampleAccount);

      const result = await delOrganizationServiceControlPolicyAttachment(
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

      expect(mockSend).toHaveBeenCalledWith(expect.any(DetachPolicyCommand));
      expect(result).toEqual({ deleted: true });
    });
  });

  given('policy not found', () => {
    then('delete should return success (idempotent)', async () => {
      (
        getOnePolicyModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(null);

      const result = await delOrganizationServiceControlPolicyAttachment(
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

      expect(mockSend).not.toHaveBeenCalled();
      expect(result).toEqual({ deleted: true });
    });
  });

  given('target account not found', () => {
    then('delete should return success (idempotent)', async () => {
      (
        getOnePolicyModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);
      (
        getOneAccountModule.getOneOrganizationAccount as jest.Mock
      ).mockResolvedValue(null);

      const result = await delOrganizationServiceControlPolicyAttachment(
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

      expect(mockSend).not.toHaveBeenCalled();
      expect(result).toEqual({ deleted: true });
    });
  });

  given('PolicyNotAttachedException is thrown', () => {
    then('delete should return success (idempotent)', async () => {
      (
        getOnePolicyModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);

      mockSend.mockImplementation((command) => {
        if (command instanceof DetachPolicyCommand) {
          const error = new Error('Policy not attached');
          error.name = 'PolicyNotAttachedException';
          return Promise.reject(error);
        }
        return Promise.resolve({});
      });

      const result = await delOrganizationServiceControlPolicyAttachment(
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

      expect(result).toEqual({ deleted: true });
    });
  });

  given('PolicyInUseException is thrown', () => {
    then('delete should throw BadRequestError', async () => {
      (
        getOnePolicyModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);

      mockSend.mockImplementation((command) => {
        if (command instanceof DetachPolicyCommand) {
          const error = new Error('Policy in use');
          error.name = 'PolicyInUseException';
          return Promise.reject(error);
        }
        return Promise.resolve({});
      });

      await expect(
        delOrganizationServiceControlPolicyAttachment(
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
      ).rejects.toThrow('cannot detach: this is the last SCP attached to root');
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
        delOrganizationServiceControlPolicyAttachment(
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
        'aws.delOrganizationServiceControlPolicyAttachment error',
      );
    });
  });
});
