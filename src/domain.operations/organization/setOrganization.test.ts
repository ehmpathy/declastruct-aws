import {
  CreateOrganizationCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import * as castModule from './castIntoDeclaredAwsOrganization';
import * as getOneModule from './getOneOrganization';
import { setOrganization } from './setOrganization';

jest.mock('@aws-sdk/client-organizations');
jest.mock('./castIntoDeclaredAwsOrganization');
jest.mock('./getOneOrganization');

const mockSend = jest.fn();
(OrganizationsClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

const sampleDesiredOrg = {
  featureSet: 'ALL' as const,
  managementAccount: { id: '123456789012' },
};

describe('setOrganization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Other commands return undefined by default
    mockSend.mockResolvedValue({});
  });

  given('an organization already exists', () => {
    then('we should return foundBefore (idempotent)', async () => {
      const foundBefore = {
        id: 'o-existing123',
        featureSet: 'ALL',
        managementAccount: { id: '123456789012' },
      };

      (getOneModule.getOneOrganization as jest.Mock).mockResolvedValue(
        foundBefore,
      );

      const result = await setOrganization(
        { findsert: sampleDesiredOrg },
        context,
      );

      // CreateOrganization should NOT be called since foundBefore exists
      expect(mockSend).not.toHaveBeenCalledWith(
        expect.any(CreateOrganizationCommand),
      );
      expect(result).toEqual(foundBefore);
    });
  });

  given('no organization exists', () => {
    then('we should create a new organization', async () => {
      const awsOrganization = {
        Id: 'o-new123xyz',
        Arn: 'arn:aws:organizations::123456789012:organization/o-new123xyz',
        FeatureSet: 'ALL',
        MasterAccountId: '123456789012',
      };

      (getOneModule.getOneOrganization as jest.Mock).mockResolvedValue(null);
      mockSend.mockImplementation((command) => {
        if (command instanceof CreateOrganizationCommand) {
          return Promise.resolve({ Organization: awsOrganization });
        }
        return Promise.resolve({});
      });
      (castModule.castIntoDeclaredAwsOrganization as jest.Mock).mockReturnValue(
        {
          id: 'o-new123xyz',
          featureSet: 'ALL',
          managementAccount: { id: '123456789012' },
        },
      );

      const result = await setOrganization(
        { findsert: sampleDesiredOrg },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(CreateOrganizationCommand),
      );
      expect(result?.id).toBe('o-new123xyz');
    });

    then('we should use CONSOLIDATED_BILLING when specified', async () => {
      const awsOrganization = {
        Id: 'o-billing123',
        FeatureSet: 'CONSOLIDATED_BILLING',
        MasterAccountId: '123456789012',
      };

      (getOneModule.getOneOrganization as jest.Mock).mockResolvedValue(null);
      mockSend.mockImplementation((command) => {
        if (command instanceof CreateOrganizationCommand) {
          return Promise.resolve({ Organization: awsOrganization });
        }
        return Promise.resolve({});
      });
      (castModule.castIntoDeclaredAwsOrganization as jest.Mock).mockReturnValue(
        {
          id: 'o-billing123',
          featureSet: 'CONSOLIDATED_BILLING',
          managementAccount: { id: '123456789012' },
        },
      );

      const result = await setOrganization(
        {
          findsert: {
            featureSet: 'CONSOLIDATED_BILLING',
            managementAccount: { id: '123456789012' },
          },
        },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(CreateOrganizationCommand),
      );
      expect(result?.featureSet).toBe('CONSOLIDATED_BILLING');
    });
  });

  given('AlreadyInOrganizationException is thrown', () => {
    then('we should return foundAfter (idempotent)', async () => {
      const foundAfter = {
        id: 'o-existing123',
        featureSet: 'ALL',
        managementAccount: { id: '123456789012' },
      };

      (getOneModule.getOneOrganization as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(foundAfter);

      mockSend.mockImplementation((command) => {
        if (command instanceof CreateOrganizationCommand) {
          const error = new Error('Already in organization');
          error.name = 'AlreadyInOrganizationException';
          return Promise.reject(error);
        }
        return Promise.resolve({});
      });

      const result = await setOrganization(
        { findsert: sampleDesiredOrg },
        context,
      );

      expect(result).toEqual(foundAfter);
    });
  });

  given('CreateOrganization returns no organization', () => {
    then('we should throw a HelpfulError', async () => {
      (getOneModule.getOneOrganization as jest.Mock).mockResolvedValue(null);
      mockSend.mockImplementation((command) => {
        if (command instanceof CreateOrganizationCommand) {
          return Promise.resolve({ Organization: undefined });
        }
        return Promise.resolve({});
      });

      await expect(
        setOrganization({ findsert: sampleDesiredOrg }, context),
      ).rejects.toThrow('CreateOrganization did not return organization');
    });
  });

  given('managementAccount mismatch before creation', () => {
    then('we should throw a BadRequestError', async () => {
      // The context has account '123456789012', but we're trying to create
      // an org with a different managementAccount id
      const desiredOrgWithWrongAccount = {
        featureSet: 'ALL' as const,
        managementAccount: { id: '999999999999' },
      };

      await expect(
        setOrganization({ findsert: desiredOrgWithWrongAccount }, context),
      ).rejects.toThrow(
        'managementAccount mismatch: desired managementAccount.id does not match authed account id',
      );
    });
  });

  given('managementAccount mismatch after creation', () => {
    then('we should throw a BadRequestError', async () => {
      const awsOrganization = {
        Id: 'o-new123xyz',
        MasterAccountId: '999999999999', // different account
      };

      (getOneModule.getOneOrganization as jest.Mock).mockResolvedValue(null);
      mockSend.mockImplementation((command) => {
        if (command instanceof CreateOrganizationCommand) {
          return Promise.resolve({ Organization: awsOrganization });
        }
        return Promise.resolve({});
      });
      (castModule.castIntoDeclaredAwsOrganization as jest.Mock).mockReturnValue(
        {
          id: 'o-new123xyz',
          featureSet: 'ALL',
          managementAccount: { id: '999999999999' },
        },
      );

      await expect(
        setOrganization({ findsert: sampleDesiredOrg }, context),
      ).rejects.toThrow(
        'created organization managementAccount does not match desired',
      );
    });
  });
});
