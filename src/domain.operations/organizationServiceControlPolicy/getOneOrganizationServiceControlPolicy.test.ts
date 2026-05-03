import {
  DescribePolicyCommand,
  ListPoliciesCommand,
  ListTagsForResourceCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import * as castModule from './castIntoDeclaredAwsOrganizationServiceControlPolicy';
import { getOneOrganizationServiceControlPolicy } from './getOneOrganizationServiceControlPolicy';

jest.mock('@aws-sdk/client-organizations');
jest.mock('./castIntoDeclaredAwsOrganizationServiceControlPolicy');

const mockSend = jest.fn();
(OrganizationsClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

const sampleAwsPolicy = {
  PolicySummary: {
    Id: 'p-abc123',
    Arn: 'arn:aws:organizations::123456789012:policy/o-org123/service_control_policy/p-abc123',
    Name: 'deny-dangerous-actions',
    Description: 'blocks exfiltration vectors',
    Type: 'SERVICE_CONTROL_POLICY',
  },
  Content: JSON.stringify({
    Version: '2012-10-17',
    Statement: [{ Effect: 'Deny', Action: '*', Resource: '*' }],
  }),
};

const sampleCastedPolicy = {
  id: 'p-abc123',
  arn: 'arn:aws:organizations::123456789012:policy/o-org123/service_control_policy/p-abc123',
  name: 'deny-dangerous-actions',
  description: 'blocks exfiltration vectors',
  content: {
    statements: [{ effect: 'Deny', action: '*', resource: '*' }],
  },
  tags: null,
};

describe('getOneOrganizationServiceControlPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({});
  });

  given('a policy exists', () => {
    then('we should return the policy by primary (id)', async () => {
      mockSend.mockImplementation((command) => {
        if (command instanceof DescribePolicyCommand) {
          return Promise.resolve({ Policy: sampleAwsPolicy });
        }
        if (command instanceof ListTagsForResourceCommand) {
          return Promise.resolve({ Tags: [] });
        }
        return Promise.resolve({});
      });
      (
        castModule.castIntoDeclaredAwsOrganizationServiceControlPolicy as jest.Mock
      ).mockReturnValue(sampleCastedPolicy);

      const result = await getOneOrganizationServiceControlPolicy(
        { by: { primary: { id: 'p-abc123' } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(DescribePolicyCommand));
      expect(result?.id).toBe('p-abc123');
    });

    then('we should return the policy by unique (name)', async () => {
      mockSend.mockImplementation((command) => {
        if (command instanceof ListPoliciesCommand) {
          return Promise.resolve({
            Policies: [{ Id: 'p-abc123', Name: 'deny-dangerous-actions' }],
          });
        }
        if (command instanceof DescribePolicyCommand) {
          return Promise.resolve({ Policy: sampleAwsPolicy });
        }
        if (command instanceof ListTagsForResourceCommand) {
          return Promise.resolve({ Tags: [] });
        }
        return Promise.resolve({});
      });
      (
        castModule.castIntoDeclaredAwsOrganizationServiceControlPolicy as jest.Mock
      ).mockReturnValue(sampleCastedPolicy);

      const result = await getOneOrganizationServiceControlPolicy(
        { by: { unique: { name: 'deny-dangerous-actions' } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(ListPoliciesCommand));
      expect(mockSend).toHaveBeenCalledWith(expect.any(DescribePolicyCommand));
      expect(result?.name).toBe('deny-dangerous-actions');
    });

    then('we should return the policy by ref (primary)', async () => {
      mockSend.mockImplementation((command) => {
        if (command instanceof DescribePolicyCommand) {
          return Promise.resolve({ Policy: sampleAwsPolicy });
        }
        if (command instanceof ListTagsForResourceCommand) {
          return Promise.resolve({ Tags: [] });
        }
        return Promise.resolve({});
      });
      (
        castModule.castIntoDeclaredAwsOrganizationServiceControlPolicy as jest.Mock
      ).mockReturnValue(sampleCastedPolicy);

      const result = await getOneOrganizationServiceControlPolicy(
        { by: { ref: { id: 'p-abc123' } } },
        context,
      );

      expect(result?.id).toBe('p-abc123');
    });

    then('we should return the policy by ref (unique)', async () => {
      mockSend.mockImplementation((command) => {
        if (command instanceof ListPoliciesCommand) {
          return Promise.resolve({
            Policies: [{ Id: 'p-abc123', Name: 'deny-dangerous-actions' }],
          });
        }
        if (command instanceof DescribePolicyCommand) {
          return Promise.resolve({ Policy: sampleAwsPolicy });
        }
        if (command instanceof ListTagsForResourceCommand) {
          return Promise.resolve({ Tags: [] });
        }
        return Promise.resolve({});
      });
      (
        castModule.castIntoDeclaredAwsOrganizationServiceControlPolicy as jest.Mock
      ).mockReturnValue(sampleCastedPolicy);

      const result = await getOneOrganizationServiceControlPolicy(
        { by: { ref: { name: 'deny-dangerous-actions' } } },
        context,
      );

      expect(result?.name).toBe('deny-dangerous-actions');
    });
  });

  given('a policy does not exist', () => {
    then('we should return null for PolicyNotFoundException', async () => {
      const error = new Error('Policy not found');
      error.name = 'PolicyNotFoundException';
      mockSend.mockRejectedValue(error);

      const result = await getOneOrganizationServiceControlPolicy(
        { by: { primary: { id: 'p-nonexistent' } } },
        context,
      );

      expect(result).toBeNull();
    });

    then('we should return null when policy not in list', async () => {
      mockSend.mockImplementation((command) => {
        if (command instanceof ListPoliciesCommand) {
          return Promise.resolve({ Policies: [] });
        }
        return Promise.resolve({});
      });

      const result = await getOneOrganizationServiceControlPolicy(
        { by: { unique: { name: 'nonexistent-policy' } } },
        context,
      );

      expect(result).toBeNull();
    });
  });

  given('an unexpected error occurs', () => {
    then('we should throw a HelpfulError', async () => {
      const error = new Error('Some unexpected error');
      error.name = 'InternalServerError';
      mockSend.mockRejectedValue(error);

      await expect(
        getOneOrganizationServiceControlPolicy(
          { by: { primary: { id: 'p-abc123' } } },
          context,
        ),
      ).rejects.toThrow('aws.getOneOrganizationServiceControlPolicy error');
    });
  });
});
