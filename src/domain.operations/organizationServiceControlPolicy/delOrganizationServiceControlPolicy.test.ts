import {
  DeletePolicyCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import { delOrganizationServiceControlPolicy } from './delOrganizationServiceControlPolicy';
import * as getOneModule from './getOneOrganizationServiceControlPolicy';

jest.mock('@aws-sdk/client-organizations');
jest.mock('./getOneOrganizationServiceControlPolicy');

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

describe('delOrganizationServiceControlPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({});
  });

  given('a policy exists', () => {
    then('we should delete by primary (id)', async () => {
      (
        getOneModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);

      const result = await delOrganizationServiceControlPolicy(
        { by: { primary: { id: 'p-abc123' } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(DeletePolicyCommand));
      expect(result).toEqual({ deleted: true });
    });

    then('we should delete by unique (name)', async () => {
      (
        getOneModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);

      const result = await delOrganizationServiceControlPolicy(
        { by: { unique: { name: 'deny-dangerous-actions' } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(DeletePolicyCommand));
      expect(result).toEqual({ deleted: true });
    });

    then('we should delete by ref (primary)', async () => {
      (
        getOneModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);

      const result = await delOrganizationServiceControlPolicy(
        { by: { ref: { id: 'p-abc123' } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(DeletePolicyCommand));
      expect(result).toEqual({ deleted: true });
    });

    then('we should delete by ref (unique)', async () => {
      (
        getOneModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);

      const result = await delOrganizationServiceControlPolicy(
        { by: { ref: { name: 'deny-dangerous-actions' } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(DeletePolicyCommand));
      expect(result).toEqual({ deleted: true });
    });
  });

  given('a policy does not exist', () => {
    then('we should return deleted: true (idempotent)', async () => {
      (
        getOneModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(null);

      const result = await delOrganizationServiceControlPolicy(
        { by: { primary: { id: 'p-nonexistent' } } },
        context,
      );

      expect(mockSend).not.toHaveBeenCalledWith(
        expect.any(DeletePolicyCommand),
      );
      expect(result).toEqual({ deleted: true });
    });
  });

  given('PolicyNotFoundException is thrown', () => {
    then('we should return deleted: true (idempotent)', async () => {
      (
        getOneModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);

      mockSend.mockImplementation((command) => {
        if (command instanceof DeletePolicyCommand) {
          const error = new Error('Policy not found');
          error.name = 'PolicyNotFoundException';
          return Promise.reject(error);
        }
        return Promise.resolve({});
      });

      const result = await delOrganizationServiceControlPolicy(
        { by: { primary: { id: 'p-abc123' } } },
        context,
      );

      expect(result).toEqual({ deleted: true });
    });
  });

  given('PolicyInUseException is thrown', () => {
    then('we should throw a BadRequestError', async () => {
      (
        getOneModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);

      mockSend.mockImplementation((command) => {
        if (command instanceof DeletePolicyCommand) {
          const error = new Error('Policy is still attached');
          error.name = 'PolicyInUseException';
          return Promise.reject(error);
        }
        return Promise.resolve({});
      });

      await expect(
        delOrganizationServiceControlPolicy(
          { by: { primary: { id: 'p-abc123' } } },
          context,
        ),
      ).rejects.toThrow('cannot delete policy: still attached to targets');
    });
  });

  given('an unexpected error occurs', () => {
    then('we should throw a HelpfulError', async () => {
      (
        getOneModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);

      const error = new Error('Some unexpected error');
      error.name = 'InternalServerError';
      mockSend.mockRejectedValue(error);

      await expect(
        delOrganizationServiceControlPolicy(
          { by: { primary: { id: 'p-abc123' } } },
          context,
        ),
      ).rejects.toThrow('aws.delOrganizationServiceControlPolicy error');
    });
  });
});
