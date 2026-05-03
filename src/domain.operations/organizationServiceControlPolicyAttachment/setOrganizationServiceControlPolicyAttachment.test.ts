import {
  AttachPolicyCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import * as getOneAccountModule from '../organizationAccount/getOneOrganizationAccount';
import * as getOnePolicyModule from '../organizationServiceControlPolicy/getOneOrganizationServiceControlPolicy';
import * as getOneAttachmentModule from './getOneOrganizationServiceControlPolicyAttachment';
import { setOrganizationServiceControlPolicyAttachment } from './setOrganizationServiceControlPolicyAttachment';

jest.mock('@aws-sdk/client-organizations');
jest.mock('../organizationAccount/getOneOrganizationAccount');
jest.mock(
  '../organizationServiceControlPolicy/getOneOrganizationServiceControlPolicy',
);
jest.mock('./getOneOrganizationServiceControlPolicyAttachment');

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

const sampleAttachment = {
  policy: { name: 'deny-dangerous-actions' },
  target: { id: '123456789012' },
};

describe('setOrganizationServiceControlPolicyAttachment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({});
  });

  given('an attachment already exists', () => {
    then('findsert should return extant attachment', async () => {
      (
        getOnePolicyModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);
      (
        getOneAttachmentModule.getOneOrganizationServiceControlPolicyAttachment as jest.Mock
      ).mockResolvedValue(sampleAttachment);

      const result = await setOrganizationServiceControlPolicyAttachment(
        {
          findsert: {
            policy: { name: 'deny-dangerous-actions' },
            target: { id: '123456789012' },
          },
        },
        context,
      );

      expect(mockSend).not.toHaveBeenCalledWith(
        expect.any(AttachPolicyCommand),
      );
      expect(result).toEqual(sampleAttachment);
    });
  });

  given('an attachment does not exist', () => {
    then('findsert should create new attachment', async () => {
      (
        getOnePolicyModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);
      (
        getOneAttachmentModule.getOneOrganizationServiceControlPolicyAttachment as jest.Mock
      ).mockResolvedValue(null);

      const result = await setOrganizationServiceControlPolicyAttachment(
        {
          findsert: {
            policy: { name: 'deny-dangerous-actions' },
            target: { id: '123456789012' },
          },
        },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(AttachPolicyCommand));
      expect(result.policy.name).toBe('deny-dangerous-actions');
      expect((result.target as { id: string }).id).toBe('123456789012');
    });

    then('findsert should create attachment with email target', async () => {
      (
        getOnePolicyModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);
      (
        getOneAccountModule.getOneOrganizationAccount as jest.Mock
      ).mockResolvedValue(sampleAccount);
      (
        getOneAttachmentModule.getOneOrganizationServiceControlPolicyAttachment as jest.Mock
      ).mockResolvedValue(null);

      const result = await setOrganizationServiceControlPolicyAttachment(
        {
          findsert: {
            policy: { name: 'deny-dangerous-actions' },
            target: { email: 'prod@example.com' },
          },
        },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(AttachPolicyCommand));
      expect(result.policy.name).toBe('deny-dangerous-actions');
    });
  });

  given('DuplicatePolicyAttachmentException is thrown', () => {
    then('findsert should return attachment (idempotent)', async () => {
      (
        getOnePolicyModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);
      (
        getOneAttachmentModule.getOneOrganizationServiceControlPolicyAttachment as jest.Mock
      ).mockResolvedValue(null);

      mockSend.mockImplementation((command) => {
        if (command instanceof AttachPolicyCommand) {
          const error = new Error('Duplicate attachment');
          error.name = 'DuplicatePolicyAttachmentException';
          return Promise.reject(error);
        }
        return Promise.resolve({});
      });

      const result = await setOrganizationServiceControlPolicyAttachment(
        {
          findsert: {
            policy: { name: 'deny-dangerous-actions' },
            target: { id: '123456789012' },
          },
        },
        context,
      );

      expect(result.policy.name).toBe('deny-dangerous-actions');
    });
  });

  given('policy not found', () => {
    then('we should throw a BadRequestError', async () => {
      (
        getOnePolicyModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(null);

      await expect(
        setOrganizationServiceControlPolicyAttachment(
          {
            findsert: {
              policy: { name: 'nonexistent-policy' },
              target: { id: '123456789012' },
            },
          },
          context,
        ),
      ).rejects.toThrow('policy not found');
    });
  });

  given('target not found', () => {
    then('we should throw a BadRequestError', async () => {
      (
        getOnePolicyModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);
      (
        getOneAccountModule.getOneOrganizationAccount as jest.Mock
      ).mockResolvedValue(null);

      await expect(
        setOrganizationServiceControlPolicyAttachment(
          {
            findsert: {
              policy: { name: 'deny-dangerous-actions' },
              target: { email: 'nonexistent@example.com' },
            },
          },
          context,
        ),
      ).rejects.toThrow('target not found');
    });
  });

  given('an unexpected error occurs', () => {
    then('we should throw a HelpfulError', async () => {
      (
        getOnePolicyModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);
      (
        getOneAttachmentModule.getOneOrganizationServiceControlPolicyAttachment as jest.Mock
      ).mockResolvedValue(null);

      const error = new Error('Some unexpected error');
      error.name = 'InternalServerError';
      mockSend.mockRejectedValue(error);

      await expect(
        setOrganizationServiceControlPolicyAttachment(
          {
            findsert: {
              policy: { name: 'deny-dangerous-actions' },
              target: { id: '123456789012' },
            },
          },
          context,
        ),
      ).rejects.toThrow(
        'aws.setOrganizationServiceControlPolicyAttachment error',
      );
    });
  });
});
