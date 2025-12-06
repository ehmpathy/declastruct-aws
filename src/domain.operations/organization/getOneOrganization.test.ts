import {
  DescribeOrganizationCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { given, then } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import * as castModule from './castIntoDeclaredAwsOrganization';
import { getOneOrganization } from './getOneOrganization';

jest.mock('@aws-sdk/client-organizations');
jest.mock('./castIntoDeclaredAwsOrganization');

const mockSend = jest.fn();
(OrganizationsClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getSampleAwsApiContext();

describe('getOneOrganization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('an organization exists', () => {
    then('we should return the casted organization', async () => {
      const awsOrganization = {
        Id: 'o-abc123xyz789',
        Arn: 'arn:aws:organizations::123456789012:organization/o-abc123xyz789',
        FeatureSet: 'ALL',
        MasterAccountId: '123456789012',
        MasterAccountEmail: 'management@example.com',
      };

      mockSend.mockResolvedValue({ Organization: awsOrganization });
      (castModule.castIntoDeclaredAwsOrganization as jest.Mock).mockReturnValue(
        {
          id: 'o-abc123xyz789',
          featureSet: 'ALL',
          managementAccount: { email: 'management@example.com' },
        },
      );

      const result = await getOneOrganization({ by: { auth: true } }, context);

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(DescribeOrganizationCommand),
      );
      expect(result).not.toBeNull();
      expect(result?.id).toBe('o-abc123xyz789');
    });
  });

  given('no organization exists', () => {
    then(
      'we should return null for AWSOrganizationsNotInUseException',
      async () => {
        const error = new Error('Organization not in use');
        error.name = 'AWSOrganizationsNotInUseException';
        mockSend.mockRejectedValue(error);

        const result = await getOneOrganization(
          { by: { auth: true } },
          context,
        );

        expect(result).toBeNull();
      },
    );

    then('we should return null when Organization is undefined', async () => {
      mockSend.mockResolvedValue({ Organization: undefined });

      const result = await getOneOrganization({ by: { auth: true } }, context);

      expect(result).toBeNull();
    });
  });

  given('an unexpected error occurs', () => {
    then('we should throw a HelpfulError', async () => {
      const error = new Error('Some unexpected error');
      error.name = 'InternalServerError';
      mockSend.mockRejectedValue(error);

      await expect(
        getOneOrganization({ by: { auth: true } }, context),
      ).rejects.toThrow('aws.getOneOrganization error');
    });
  });
});
