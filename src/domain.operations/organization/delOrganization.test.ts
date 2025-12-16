import {
  DeleteOrganizationCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import { delOrganization } from './delOrganization';
import * as getOneModule from './getOneOrganization';

jest.mock('@aws-sdk/client-organizations');
jest.mock('./getOneOrganization');

const mockSend = jest.fn();
(OrganizationsClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

const sampleOrgRef = {
  primary: { id: 'o-abc123xyz789' },
};

const sampleOrgRefByUnique = {
  unique: { managementAccount: { id: '123456789012' } },
};

describe('delOrganization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('an organization exists by primary', () => {
    then('we should delete the organization', async () => {
      (getOneModule.getOneOrganization as jest.Mock).mockResolvedValue({
        id: 'o-abc123xyz789',
        managementAccount: { id: '123456789012' },
      });
      mockSend.mockResolvedValue({});

      const result = await delOrganization({ by: sampleOrgRef }, context);

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(DeleteOrganizationCommand),
      );
      expect(result).toEqual({ deleted: true });
    });
  });

  given('an organization exists by unique', () => {
    then('we should delete the organization', async () => {
      (getOneModule.getOneOrganization as jest.Mock).mockResolvedValue({
        id: 'o-abc123xyz789',
        managementAccount: { id: '123456789012' },
      });
      mockSend.mockResolvedValue({});

      const result = await delOrganization(
        { by: sampleOrgRefByUnique },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(DeleteOrganizationCommand),
      );
      expect(result).toEqual({ deleted: true });
    });
  });

  given('no organization exists', () => {
    then('we should return success (idempotent)', async () => {
      (getOneModule.getOneOrganization as jest.Mock).mockResolvedValue(null);

      const result = await delOrganization({ by: sampleOrgRef }, context);

      expect(mockSend).not.toHaveBeenCalled();
      expect(result).toEqual({ deleted: true });
    });
  });

  given('AWSOrganizationsNotInUseException is thrown', () => {
    then('we should return success (idempotent)', async () => {
      (getOneModule.getOneOrganization as jest.Mock).mockResolvedValue({
        id: 'o-abc123xyz789',
        managementAccount: { id: '123456789012' },
      });

      const error = new Error('Organization not in use');
      error.name = 'AWSOrganizationsNotInUseException';
      mockSend.mockRejectedValue(error);

      const result = await delOrganization({ by: sampleOrgRef }, context);

      expect(result).toEqual({ deleted: true });
    });
  });

  given('an unexpected error occurs', () => {
    then('we should throw a HelpfulError', async () => {
      (getOneModule.getOneOrganization as jest.Mock).mockResolvedValue({
        id: 'o-abc123xyz789',
        managementAccount: { id: '123456789012' },
      });

      const error = new Error('Some unexpected error');
      error.name = 'OrganizationNotEmptyException';
      mockSend.mockRejectedValue(error);

      await expect(
        delOrganization({ by: sampleOrgRef }, context),
      ).rejects.toThrow('aws.delOrganization error');
    });
  });

  given('organization id mismatch', () => {
    then('we should throw a BadRequestError', async () => {
      (getOneModule.getOneOrganization as jest.Mock).mockResolvedValue({
        id: 'o-differentorg',
        managementAccount: { id: '123456789012' },
      });

      await expect(
        delOrganization({ by: sampleOrgRef }, context),
      ).rejects.toThrow('organization id mismatch');
    });
  });

  given('organization managementAccount mismatch', () => {
    then('we should throw a BadRequestError', async () => {
      (getOneModule.getOneOrganization as jest.Mock).mockResolvedValue({
        id: 'o-abc123xyz789',
        managementAccount: { id: '999999999999' },
      });

      await expect(
        delOrganization({ by: sampleOrgRefByUnique }, context),
      ).rejects.toThrow('organization managementAccount mismatch');
    });
  });
});
