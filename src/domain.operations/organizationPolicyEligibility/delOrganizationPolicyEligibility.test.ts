import {
  DisablePolicyTypeCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import * as getRootIdModule from '../organization/getOrganizationRootId';
import { delOrganizationPolicyEligibility } from './delOrganizationPolicyEligibility';
import * as getOneModule from './getOneOrganizationPolicyEligibility';

jest.mock('@aws-sdk/client-organizations');
jest.mock('./getOneOrganizationPolicyEligibility');
jest.mock('../organization/getOrganizationRootId');

const mockSend = jest.fn();
(OrganizationsClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

describe('delOrganizationPolicyEligibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({});
    (getRootIdModule.getOrganizationRootId as jest.Mock).mockResolvedValue(
      'r-abc1',
    );
  });

  given('the policy type is enabled', () => {
    then('we should disable it', async () => {
      (
        getOneModule.getOneOrganizationPolicyEligibility as jest.Mock
      ).mockResolvedValue({
        type: 'SERVICE_CONTROL_POLICY',
        choice: 'ENABLED',
      });

      const result = await delOrganizationPolicyEligibility(
        { by: { unique: { type: 'SERVICE_CONTROL_POLICY' } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(DisablePolicyTypeCommand),
      );
      expect(result).toEqual({ deleted: true });
    });
  });

  given('the policy type is not enabled', () => {
    then('we should return deleted true without API call', async () => {
      (
        getOneModule.getOneOrganizationPolicyEligibility as jest.Mock
      ).mockResolvedValue(null);

      const result = await delOrganizationPolicyEligibility(
        { by: { unique: { type: 'SERVICE_CONTROL_POLICY' } } },
        context,
      );

      expect(mockSend).not.toHaveBeenCalled();
      expect(result).toEqual({ deleted: true });
    });

    then(
      'we should handle PolicyTypeNotEnabledException idempotently',
      async () => {
        (
          getOneModule.getOneOrganizationPolicyEligibility as jest.Mock
        ).mockResolvedValue({
          type: 'SERVICE_CONTROL_POLICY',
          choice: 'ENABLED',
        });

        const error = new Error('Not enabled');
        error.name = 'PolicyTypeNotEnabledException';
        mockSend.mockRejectedValue(error);

        const result = await delOrganizationPolicyEligibility(
          { by: { unique: { type: 'SERVICE_CONTROL_POLICY' } } },
          context,
        );

        expect(result).toEqual({ deleted: true });
      },
    );
  });

  given('not in an organization', () => {
    then('we should throw when root id not found', async () => {
      (
        getOneModule.getOneOrganizationPolicyEligibility as jest.Mock
      ).mockResolvedValue({
        type: 'SERVICE_CONTROL_POLICY',
        choice: 'ENABLED',
      });
      (getRootIdModule.getOrganizationRootId as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        delOrganizationPolicyEligibility(
          { by: { unique: { type: 'SERVICE_CONTROL_POLICY' } } },
          context,
        ),
      ).rejects.toThrow('not in an organization');
    });
  });

  given('an unexpected error occurs', () => {
    then('we should throw a HelpfulError', async () => {
      (
        getOneModule.getOneOrganizationPolicyEligibility as jest.Mock
      ).mockResolvedValue({
        type: 'SERVICE_CONTROL_POLICY',
        choice: 'ENABLED',
      });

      const error = new Error('Some unexpected error');
      error.name = 'InternalServerError';
      mockSend.mockRejectedValue(error);

      await expect(
        delOrganizationPolicyEligibility(
          { by: { unique: { type: 'SERVICE_CONTROL_POLICY' } } },
          context,
        ),
      ).rejects.toThrow('aws.delOrganizationPolicyEligibility error');
    });
  });
});
