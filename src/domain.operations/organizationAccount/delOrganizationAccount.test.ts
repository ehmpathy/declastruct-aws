import {
  CloseAccountCommand,
  type OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { BadRequestError } from 'helpful-errors';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';
import * as getAwsOrganizationsClientModule from '@src/access/sdks/getAwsOrganizationsClient';

import { delOrganizationAccount } from './delOrganizationAccount';
import * as getOneAccountModule from './getOneOrganizationAccount';

jest.mock('../../access/sdks/getAwsOrganizationsClient');
jest.mock('./getOneOrganizationAccount');

const mockSend = jest.fn();
const mockClient = { send: mockSend } as unknown as OrganizationsClient;

const context = getMockedAwsApiContext();

const sampleAccountRef = {
  primary: { id: '123456789012' },
};

const sampleAccountRefByUnique = {
  unique: { email: 'test@example.com' },
};

const sampleActiveAccount = {
  id: '123456789012',
  email: 'test@example.com',
  state: 'ACTIVE',
  organization: { id: 'o-abc123xyz789' },
};

describe('delOrganizationAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // default: org manager auth succeeds
    (
      getAwsOrganizationsClientModule.getAwsOrganizationsClient as jest.Mock
    ).mockResolvedValue({
      client: mockClient,
      organization: { id: 'o-abc123xyz789' },
    });
    mockSend.mockResolvedValue({});
  });

  given('an active account exists by primary', () => {
    then('we should close the account', async () => {
      (
        getOneAccountModule.getOneOrganizationAccount as jest.Mock
      ).mockResolvedValue(sampleActiveAccount);
      mockSend.mockResolvedValue({});

      const result = await delOrganizationAccount(
        { by: sampleAccountRef },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(CloseAccountCommand));
      expect(result).toEqual({ closed: true });
    });
  });

  given('an active account exists by unique', () => {
    then('we should close the account', async () => {
      (
        getOneAccountModule.getOneOrganizationAccount as jest.Mock
      ).mockResolvedValue(sampleActiveAccount);
      mockSend.mockResolvedValue({});

      const result = await delOrganizationAccount(
        { by: sampleAccountRefByUnique },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(CloseAccountCommand));
      expect(result).toEqual({ closed: true });
    });
  });

  given('no account exists', () => {
    then('we should return success (idempotent)', async () => {
      (
        getOneAccountModule.getOneOrganizationAccount as jest.Mock
      ).mockResolvedValue(null);

      const result = await delOrganizationAccount(
        { by: sampleAccountRef },
        context,
      );

      expect(mockSend).not.toHaveBeenCalled();
      expect(result).toEqual({ closed: true });
    });
  });

  given('account is already SUSPENDED', () => {
    then('we should return success (idempotent)', async () => {
      (
        getOneAccountModule.getOneOrganizationAccount as jest.Mock
      ).mockResolvedValue({ ...sampleActiveAccount, state: 'SUSPENDED' });

      const result = await delOrganizationAccount(
        { by: sampleAccountRef },
        context,
      );

      expect(mockSend).not.toHaveBeenCalled();
      expect(result).toEqual({ closed: true });
    });
  });

  given('account is PENDING_CLOSURE', () => {
    then('we should return success (idempotent)', async () => {
      (
        getOneAccountModule.getOneOrganizationAccount as jest.Mock
      ).mockResolvedValue({ ...sampleActiveAccount, state: 'PENDING_CLOSURE' });

      const result = await delOrganizationAccount(
        { by: sampleAccountRef },
        context,
      );

      expect(mockSend).not.toHaveBeenCalled();
      expect(result).toEqual({ closed: true });
    });
  });

  given('AccountAlreadyClosedException is thrown', () => {
    then('we should return success (idempotent)', async () => {
      (
        getOneAccountModule.getOneOrganizationAccount as jest.Mock
      ).mockResolvedValue(sampleActiveAccount);

      const error = new Error('Account already closed');
      error.name = 'AccountAlreadyClosedException';
      mockSend.mockRejectedValue(error);

      const result = await delOrganizationAccount(
        { by: sampleAccountRef },
        context,
      );

      expect(result).toEqual({ closed: true });
    });
  });

  given('an unexpected error occurs', () => {
    then('we should throw a HelpfulError', async () => {
      (
        getOneAccountModule.getOneOrganizationAccount as jest.Mock
      ).mockResolvedValue(sampleActiveAccount);

      const error = new Error('Some unexpected error');
      error.name = 'ConstraintViolationException';
      mockSend.mockRejectedValue(error);

      await expect(
        delOrganizationAccount({ by: sampleAccountRef }, context),
      ).rejects.toThrow('aws.delOrganizationAccount error');
    });
  });

  given('no org manager auth', () => {
    then('we should throw BadRequestError', async () => {
      (
        getAwsOrganizationsClientModule.getAwsOrganizationsClient as jest.Mock
      ).mockRejectedValue(
        new BadRequestError(
          'org manager auth required to use organizations client',
        ),
      );

      await expect(
        delOrganizationAccount({ by: sampleAccountRef }, context),
      ).rejects.toThrow('org manager auth required');
    });
  });

  given('account id mismatch', () => {
    then('we should throw a BadRequestError', async () => {
      (
        getOneAccountModule.getOneOrganizationAccount as jest.Mock
      ).mockResolvedValue({ ...sampleActiveAccount, id: '999999999999' });

      await expect(
        delOrganizationAccount({ by: sampleAccountRef }, context),
      ).rejects.toThrow('account id mismatch');
    });
  });

  given('account email mismatch', () => {
    then('we should throw a BadRequestError', async () => {
      (
        getOneAccountModule.getOneOrganizationAccount as jest.Mock
      ).mockResolvedValue({
        ...sampleActiveAccount,
        email: 'different@example.com',
      });

      await expect(
        delOrganizationAccount({ by: sampleAccountRefByUnique }, context),
      ).rejects.toThrow('account email mismatch');
    });
  });
});
