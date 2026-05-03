import {
  DisablePolicyTypeCommand,
  EnablePolicyTypeCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import * as getRootIdModule from '../organization/getOrganizationRootId';
import * as getOneModule from './getOneOrganizationPolicyEligibility';
import { setOrganizationPolicyEligibility } from './setOrganizationPolicyEligibility';

jest.mock('@aws-sdk/client-organizations');
jest.mock('./getOneOrganizationPolicyEligibility');
jest.mock('../organization/getOrganizationRootId');

const mockSend = jest.fn();
(OrganizationsClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

describe('setOrganizationPolicyEligibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({});
    (getRootIdModule.getOrganizationRootId as jest.Mock).mockResolvedValue(
      'r-abc1',
    );
  });

  given('choice is ENABLED', () => {
    then(
      'we should enable the policy type when not currently enabled',
      async () => {
        (
          getOneModule.getOneOrganizationPolicyEligibility as jest.Mock
        ).mockResolvedValue(null);

        const result = await setOrganizationPolicyEligibility(
          {
            findsert: {
              type: 'SERVICE_CONTROL_POLICY',
              choice: 'ENABLED',
            },
          },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(
          expect.any(EnablePolicyTypeCommand),
        );
        expect(result.type).toBe('SERVICE_CONTROL_POLICY');
        expect(result.choice).toBe('ENABLED');
      },
    );

    then('we should return extant when already enabled', async () => {
      const extant = {
        type: 'SERVICE_CONTROL_POLICY',
        choice: 'ENABLED',
      };
      (
        getOneModule.getOneOrganizationPolicyEligibility as jest.Mock
      ).mockResolvedValue(extant);

      const result = await setOrganizationPolicyEligibility(
        {
          findsert: {
            type: 'SERVICE_CONTROL_POLICY',
            choice: 'ENABLED',
          },
        },
        context,
      );

      expect(mockSend).not.toHaveBeenCalled();
      expect(result).toBe(extant);
    });

    then(
      'we should handle PolicyTypeAlreadyEnabledException idempotently',
      async () => {
        (
          getOneModule.getOneOrganizationPolicyEligibility as jest.Mock
        ).mockResolvedValue(null);

        const error = new Error('Already enabled');
        error.name = 'PolicyTypeAlreadyEnabledException';
        mockSend.mockRejectedValue(error);

        const result = await setOrganizationPolicyEligibility(
          {
            findsert: {
              type: 'SERVICE_CONTROL_POLICY',
              choice: 'ENABLED',
            },
          },
          context,
        );

        expect(result.type).toBe('SERVICE_CONTROL_POLICY');
        expect(result.choice).toBe('ENABLED');
      },
    );
  });

  given('choice is DISABLED', () => {
    then(
      'we should disable the policy type when currently enabled',
      async () => {
        (
          getOneModule.getOneOrganizationPolicyEligibility as jest.Mock
        ).mockResolvedValue({
          type: 'SERVICE_CONTROL_POLICY',
          choice: 'ENABLED',
        });

        const result = await setOrganizationPolicyEligibility(
          {
            findsert: {
              type: 'SERVICE_CONTROL_POLICY',
              choice: 'DISABLED',
            },
          },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(
          expect.any(DisablePolicyTypeCommand),
        );
        expect(result.type).toBe('SERVICE_CONTROL_POLICY');
        expect(result.choice).toBe('DISABLED');
      },
    );

    then(
      'we should return immediately when not currently enabled',
      async () => {
        (
          getOneModule.getOneOrganizationPolicyEligibility as jest.Mock
        ).mockResolvedValue(null);

        const result = await setOrganizationPolicyEligibility(
          {
            findsert: {
              type: 'SERVICE_CONTROL_POLICY',
              choice: 'DISABLED',
            },
          },
          context,
        );

        expect(mockSend).not.toHaveBeenCalled();
        expect(result.type).toBe('SERVICE_CONTROL_POLICY');
        expect(result.choice).toBe('DISABLED');
      },
    );

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

        const result = await setOrganizationPolicyEligibility(
          {
            findsert: {
              type: 'SERVICE_CONTROL_POLICY',
              choice: 'DISABLED',
            },
          },
          context,
        );

        expect(result.type).toBe('SERVICE_CONTROL_POLICY');
        expect(result.choice).toBe('DISABLED');
      },
    );
  });

  given('not in an organization', () => {
    then('we should throw when root id not found', async () => {
      (
        getOneModule.getOneOrganizationPolicyEligibility as jest.Mock
      ).mockResolvedValue(null);
      (getRootIdModule.getOrganizationRootId as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        setOrganizationPolicyEligibility(
          {
            findsert: {
              type: 'SERVICE_CONTROL_POLICY',
              choice: 'ENABLED',
            },
          },
          context,
        ),
      ).rejects.toThrow('not in an organization');
    });
  });

  given('an unexpected error occurs', () => {
    then('we should throw a HelpfulError', async () => {
      (
        getOneModule.getOneOrganizationPolicyEligibility as jest.Mock
      ).mockResolvedValue(null);

      const error = new Error('Some unexpected error');
      error.name = 'InternalServerError';
      mockSend.mockRejectedValue(error);

      await expect(
        setOrganizationPolicyEligibility(
          {
            findsert: {
              type: 'SERVICE_CONTROL_POLICY',
              choice: 'ENABLED',
            },
          },
          context,
        ),
      ).rejects.toThrow('aws.setOrganizationPolicyEligibility error');
    });
  });
});
