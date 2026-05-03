import {
  ListPoliciesForTargetCommand,
  ListTargetsForPolicyCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import * as getOneOrgModule from '../organization/getOneOrganization';
import * as getOneAccountModule from '../organizationAccount/getOneOrganizationAccount';
import * as getOnePolicyModule from '../organizationServiceControlPolicy/getOneOrganizationServiceControlPolicy';
import { getAllOrganizationServiceControlPolicyAttachments } from './getAllOrganizationServiceControlPolicyAttachments';

jest.mock('@aws-sdk/client-organizations');
jest.mock('../organization/getOneOrganization');
jest.mock('../organizationAccount/getOneOrganizationAccount');
jest.mock(
  '../organizationServiceControlPolicy/getOneOrganizationServiceControlPolicy',
);

const mockSend = jest.fn();
(OrganizationsClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

const sampleOrg = {
  id: 'o-abc123',
  arn: 'arn:aws:organizations::123456789012:organization/o-abc123',
  managementAccount: { id: '123456789012' },
  featureSet: 'ALL',
};

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

describe('getAllOrganizationServiceControlPolicyAttachments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({});
  });

  given('forPolicy input', () => {
    then('we should return attachments for account targets', async () => {
      (
        getOnePolicyModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);

      mockSend.mockImplementation((command) => {
        if (command instanceof ListTargetsForPolicyCommand) {
          return Promise.resolve({
            Targets: [
              { TargetId: '111111111111', Type: 'ACCOUNT' },
              { TargetId: '222222222222', Type: 'ACCOUNT' },
            ],
            NextToken: undefined,
          });
        }
        return Promise.resolve({});
      });

      const result = await getAllOrganizationServiceControlPolicyAttachments(
        { forPolicy: { name: 'deny-dangerous-actions' } },
        context,
      );

      expect(result).toHaveLength(2);
      expect((result[0]!.target as { id: string }).id).toBe('111111111111');
      expect((result[1]!.target as { id: string }).id).toBe('222222222222');
    });

    then(
      'we should include ROOT and ACCOUNT targets, skip OU targets',
      async () => {
        (
          getOnePolicyModule.getOneOrganizationServiceControlPolicy as jest.Mock
        ).mockResolvedValue(samplePolicy);
        (getOneOrgModule.getOneOrganization as jest.Mock).mockResolvedValue(
          sampleOrg,
        );

        mockSend.mockImplementation((command) => {
          if (command instanceof ListTargetsForPolicyCommand) {
            return Promise.resolve({
              Targets: [
                { TargetId: 'r-abc1', Type: 'ROOT' },
                { TargetId: 'ou-abc1-xyz', Type: 'ORGANIZATIONAL_UNIT' },
                { TargetId: '111111111111', Type: 'ACCOUNT' },
              ],
              NextToken: undefined,
            });
          }
          return Promise.resolve({});
        });

        const result = await getAllOrganizationServiceControlPolicyAttachments(
          { forPolicy: { name: 'deny-dangerous-actions' } },
          context,
        );

        // should return ROOT (as org ref) and ACCOUNT targets, skip OU targets
        expect(result).toHaveLength(2);
        expect((result[0]!.target as { id: string }).id).toBe('o-abc123');
        expect((result[1]!.target as { id: string }).id).toBe('111111111111');
      },
    );

    then('we should return empty array if policy not found', async () => {
      (
        getOnePolicyModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(null);

      const result = await getAllOrganizationServiceControlPolicyAttachments(
        { forPolicy: { name: 'nonexistent' } },
        context,
      );

      expect(result).toEqual([]);
    });

    then('we should paginate through all targets', async () => {
      (
        getOnePolicyModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(samplePolicy);

      let callCount = 0;
      mockSend.mockImplementation((command) => {
        if (command instanceof ListTargetsForPolicyCommand) {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              Targets: [{ TargetId: '111111111111', Type: 'ACCOUNT' }],
              NextToken: 'token-1',
            });
          }
          return Promise.resolve({
            Targets: [{ TargetId: '222222222222', Type: 'ACCOUNT' }],
            NextToken: undefined,
          });
        }
        return Promise.resolve({});
      });

      const result = await getAllOrganizationServiceControlPolicyAttachments(
        { forPolicy: { name: 'deny-dangerous-actions' } },
        context,
      );

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });
  });

  given('forTarget input with id', () => {
    then('we should return attachments for target', async () => {
      mockSend.mockImplementation((command) => {
        if (command instanceof ListPoliciesForTargetCommand) {
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

      const result = await getAllOrganizationServiceControlPolicyAttachments(
        { forTarget: { id: '123456789012' } },
        context,
      );

      expect(result).toHaveLength(2);
      expect(result[0]!.policy.name).toBe('deny-dangerous-actions');
      expect(result[1]!.policy.name).toBe('deny-audit-tamper');
    });

    then('we should paginate through all policies', async () => {
      let callCount = 0;
      mockSend.mockImplementation((command) => {
        if (command instanceof ListPoliciesForTargetCommand) {
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

      const result = await getAllOrganizationServiceControlPolicyAttachments(
        { forTarget: { id: '123456789012' } },
        context,
      );

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });
  });

  given('forTarget input with email', () => {
    then('we should lookup account and return attachments', async () => {
      (
        getOneAccountModule.getOneOrganizationAccount as jest.Mock
      ).mockResolvedValue(sampleAccount);

      mockSend.mockImplementation((command) => {
        if (command instanceof ListPoliciesForTargetCommand) {
          return Promise.resolve({
            Policies: [{ Id: 'p-abc123', Name: 'deny-dangerous-actions' }],
            NextToken: undefined,
          });
        }
        return Promise.resolve({});
      });

      const result = await getAllOrganizationServiceControlPolicyAttachments(
        { forTarget: { email: 'prod@example.com' } },
        context,
      );

      expect(result).toHaveLength(1);
      // target preserves original ref shape (email, not id)
      expect((result[0]!.target as { email: string }).email).toBe(
        'prod@example.com',
      );
    });

    then('we should return empty array if account not found', async () => {
      (
        getOneAccountModule.getOneOrganizationAccount as jest.Mock
      ).mockResolvedValue(null);

      const result = await getAllOrganizationServiceControlPolicyAttachments(
        { forTarget: { email: 'nonexistent@example.com' } },
        context,
      );

      expect(result).toEqual([]);
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
        getAllOrganizationServiceControlPolicyAttachments(
          { forPolicy: { name: 'deny-dangerous-actions' } },
          context,
        ),
      ).rejects.toThrow(
        'aws.getAllOrganizationServiceControlPolicyAttachments error',
      );
    });
  });
});
