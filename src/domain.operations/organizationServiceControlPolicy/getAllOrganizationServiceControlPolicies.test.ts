import {
  ListPoliciesCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import { getAllOrganizationServiceControlPolicies } from './getAllOrganizationServiceControlPolicies';
import * as getOneModule from './getOneOrganizationServiceControlPolicy';

jest.mock('@aws-sdk/client-organizations');
jest.mock('./getOneOrganizationServiceControlPolicy');

const mockSend = jest.fn();
(OrganizationsClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

const samplePolicy1 = {
  id: 'p-abc123',
  name: 'deny-dangerous-actions',
  description: 'blocks exfiltration vectors',
  content: { statements: [] },
  tags: null,
};

const samplePolicy2 = {
  id: 'p-def456',
  name: 'deny-audit-tamper',
  description: 'blocks audit modification',
  content: { statements: [] },
  tags: null,
};

describe('getAllOrganizationServiceControlPolicies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({});
  });

  given('policies exist', () => {
    then('we should return all policies', async () => {
      mockSend.mockImplementation((command) => {
        if (command instanceof ListPoliciesCommand) {
          return Promise.resolve({
            Policies: [
              { Id: 'p-abc123', Name: 'deny-dangerous-actions' },
              { Id: 'p-def456', Name: 'deny-audit-tamper' },
            ],
            NextToken: undefined,
          });
        }
        return Promise.resolve({});
      });

      (getOneModule.getOneOrganizationServiceControlPolicy as jest.Mock)
        .mockResolvedValueOnce(samplePolicy1)
        .mockResolvedValueOnce(samplePolicy2);

      const result = await getAllOrganizationServiceControlPolicies(
        {},
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(ListPoliciesCommand));
      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe('p-abc123');
      expect(result[1]!.id).toBe('p-def456');
    });

    then('we should paginate through all policies', async () => {
      let callCount = 0;
      mockSend.mockImplementation((command) => {
        if (command instanceof ListPoliciesCommand) {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              Policies: [{ Id: 'p-abc123', Name: 'policy-1' }],
              NextToken: 'token-1',
            });
          }
          return Promise.resolve({
            Policies: [{ Id: 'p-def456', Name: 'policy-2' }],
            NextToken: undefined,
          });
        }
        return Promise.resolve({});
      });

      (getOneModule.getOneOrganizationServiceControlPolicy as jest.Mock)
        .mockResolvedValueOnce(samplePolicy1)
        .mockResolvedValueOnce(samplePolicy2);

      const result = await getAllOrganizationServiceControlPolicies(
        {},
        context,
      );

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });
  });

  given('no policies exist', () => {
    then('we should return empty array', async () => {
      mockSend.mockImplementation((command) => {
        if (command instanceof ListPoliciesCommand) {
          return Promise.resolve({
            Policies: [],
            NextToken: undefined,
          });
        }
        return Promise.resolve({});
      });

      const result = await getAllOrganizationServiceControlPolicies(
        {},
        context,
      );

      expect(result).toEqual([]);
    });
  });

  given('getOne returns null for a policy', () => {
    then('we should skip that policy', async () => {
      mockSend.mockImplementation((command) => {
        if (command instanceof ListPoliciesCommand) {
          return Promise.resolve({
            Policies: [
              { Id: 'p-abc123', Name: 'policy-1' },
              { Id: 'p-def456', Name: 'policy-2' },
            ],
            NextToken: undefined,
          });
        }
        return Promise.resolve({});
      });

      (getOneModule.getOneOrganizationServiceControlPolicy as jest.Mock)
        .mockResolvedValueOnce(samplePolicy1)
        .mockResolvedValueOnce(null);

      const result = await getAllOrganizationServiceControlPolicies(
        {},
        context,
      );

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('p-abc123');
    });
  });

  given('an unexpected error occurs', () => {
    then('we should throw a HelpfulError', async () => {
      const error = new Error('Some unexpected error');
      error.name = 'InternalServerError';
      mockSend.mockRejectedValue(error);

      await expect(
        getAllOrganizationServiceControlPolicies({}, context),
      ).rejects.toThrow('aws.getAllOrganizationServiceControlPolicies error');
    });
  });
});
