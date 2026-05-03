import {
  ListRootsCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import { getOneOrganizationPolicyEligibility } from './getOneOrganizationPolicyEligibility';

jest.mock('@aws-sdk/client-organizations');

const mockSend = jest.fn();
(OrganizationsClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

describe('getOneOrganizationPolicyEligibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({});
  });

  given('the policy type is enabled', () => {
    then('we should return the eligibility with choice ENABLED', async () => {
      mockSend.mockResolvedValue({
        Roots: [
          {
            Id: 'r-abc1',
            PolicyTypes: [
              { Type: 'SERVICE_CONTROL_POLICY', Status: 'ENABLED' },
            ],
          },
        ],
      });

      const result = await getOneOrganizationPolicyEligibility(
        { by: { unique: { type: 'SERVICE_CONTROL_POLICY' } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(ListRootsCommand));
      expect(result).not.toBeNull();
      expect(result?.type).toBe('SERVICE_CONTROL_POLICY');
      expect(result?.choice).toBe('ENABLED');
    });

    then('we should handle multiple policy types enabled', async () => {
      mockSend.mockResolvedValue({
        Roots: [
          {
            Id: 'r-abc1',
            PolicyTypes: [
              { Type: 'SERVICE_CONTROL_POLICY', Status: 'ENABLED' },
              { Type: 'TAG_POLICY', Status: 'ENABLED' },
              { Type: 'BACKUP_POLICY', Status: 'ENABLED' },
            ],
          },
        ],
      });

      const result = await getOneOrganizationPolicyEligibility(
        { by: { unique: { type: 'TAG_POLICY' } } },
        context,
      );

      expect(result?.type).toBe('TAG_POLICY');
      expect(result?.choice).toBe('ENABLED');
    });
  });

  given('the policy type is not enabled', () => {
    then('we should return null when no policy types enabled', async () => {
      mockSend.mockResolvedValue({
        Roots: [
          {
            Id: 'r-abc1',
            PolicyTypes: [],
          },
        ],
      });

      const result = await getOneOrganizationPolicyEligibility(
        { by: { unique: { type: 'SERVICE_CONTROL_POLICY' } } },
        context,
      );

      expect(result).toBeNull();
    });

    then('we should return null when requested type not in list', async () => {
      mockSend.mockResolvedValue({
        Roots: [
          {
            Id: 'r-abc1',
            PolicyTypes: [{ Type: 'TAG_POLICY', Status: 'ENABLED' }],
          },
        ],
      });

      const result = await getOneOrganizationPolicyEligibility(
        { by: { unique: { type: 'SERVICE_CONTROL_POLICY' } } },
        context,
      );

      expect(result).toBeNull();
    });

    then('we should return null when status is not ENABLED', async () => {
      mockSend.mockResolvedValue({
        Roots: [
          {
            Id: 'r-abc1',
            PolicyTypes: [
              { Type: 'SERVICE_CONTROL_POLICY', Status: 'PENDING_ENABLE' },
            ],
          },
        ],
      });

      const result = await getOneOrganizationPolicyEligibility(
        { by: { unique: { type: 'SERVICE_CONTROL_POLICY' } } },
        context,
      );

      expect(result).toBeNull();
    });
  });

  given('no organization exists', () => {
    then('we should return null when no roots', async () => {
      mockSend.mockResolvedValue({ Roots: [] });

      const result = await getOneOrganizationPolicyEligibility(
        { by: { unique: { type: 'SERVICE_CONTROL_POLICY' } } },
        context,
      );

      expect(result).toBeNull();
    });

    then(
      'we should return null for AWSOrganizationsNotInUseException',
      async () => {
        const error = new Error('Not in organization');
        error.name = 'AWSOrganizationsNotInUseException';
        mockSend.mockRejectedValue(error);

        const result = await getOneOrganizationPolicyEligibility(
          { by: { unique: { type: 'SERVICE_CONTROL_POLICY' } } },
          context,
        );

        expect(result).toBeNull();
      },
    );
  });

  given('an unexpected error occurs', () => {
    then('we should throw a HelpfulError', async () => {
      const error = new Error('Some unexpected error');
      error.name = 'InternalServerError';
      mockSend.mockRejectedValue(error);

      await expect(
        getOneOrganizationPolicyEligibility(
          { by: { unique: { type: 'SERVICE_CONTROL_POLICY' } } },
          context,
        ),
      ).rejects.toThrow('aws.getOneOrganizationPolicyEligibility error');
    });
  });
});
