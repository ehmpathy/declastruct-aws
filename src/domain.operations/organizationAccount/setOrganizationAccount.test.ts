import {
  CreateAccountCommand,
  DescribeCreateAccountStatusCommand,
  type OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { BadRequestError } from 'helpful-errors';
import { given, then, when } from 'test-fns';
import { getMockedAwsApiContext } from '../../.test/getMockedAwsApiContext';
import * as getAwsOrganizationsClientModule from '../../access/sdks/getAwsOrganizationsClient';
import * as getOneAccountModule from './getOneOrganizationAccount';
import { setOrganizationAccount } from './setOrganizationAccount';

jest.mock('../../access/sdks/getAwsOrganizationsClient');
jest.mock('./getOneOrganizationAccount');

const mockSend = jest.fn();
const mockClient = { send: mockSend } as unknown as OrganizationsClient;

const context = getMockedAwsApiContext();

const sampleDesiredAccount = {
  name: 'test-account',
  email: 'test@example.com',
  organization: { managementAccount: { id: '111111111111' } },
};

const sampleFoundAccount = {
  id: '123456789012',
  arn: 'arn:aws:organizations::111111111111:account/o-abc123xyz789/123456789012',
  name: 'test-account',
  email: 'test@example.com',
  organization: { managementAccount: { id: '111111111111' } },
  state: 'ACTIVE',
  joinedMethod: 'CREATED',
};

describe('setOrganizationAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // default: org manager auth succeeds
    (
      getAwsOrganizationsClientModule.getAwsOrganizationsClient as jest.Mock
    ).mockResolvedValue({
      client: mockClient,
      organization: { managementAccount: { id: '111111111111' } },
    });
    mockSend.mockResolvedValue({});
  });

  given('an account already exists', () => {
    then('we should return foundBefore (idempotent)', async () => {
      (
        getOneAccountModule.getOneOrganizationAccount as jest.Mock
      ).mockResolvedValue(sampleFoundAccount);

      const result = await setOrganizationAccount(
        { finsert: sampleDesiredAccount as any },
        context,
      );

      expect(mockSend).not.toHaveBeenCalledWith(
        expect.any(CreateAccountCommand),
      );
      expect(result).toEqual(sampleFoundAccount);
    });
  });

  given('no account exists', () => {
    when('creation succeeds', () => {
      then('we should create a new account', async () => {
        (getOneAccountModule.getOneOrganizationAccount as jest.Mock)
          .mockResolvedValueOnce(null) // foundBefore
          .mockResolvedValueOnce(sampleFoundAccount); // foundAfter

        mockSend.mockImplementation((command) => {
          if (command instanceof CreateAccountCommand) {
            return Promise.resolve({
              CreateAccountStatus: {
                Id: 'car-12345',
                State: 'SUCCEEDED',
                AccountId: '123456789012',
              },
            });
          }
          if (command instanceof DescribeCreateAccountStatusCommand) {
            return Promise.resolve({
              CreateAccountStatus: {
                Id: 'car-12345',
                State: 'SUCCEEDED',
                AccountId: '123456789012',
              },
            });
          }
          return Promise.resolve({});
        });

        const result = await setOrganizationAccount(
          { finsert: sampleDesiredAccount as any },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(expect.any(CreateAccountCommand));
        expect(result.id).toBe('123456789012');
      });
    });

    when('creation is in progress', () => {
      then('we should poll until completion', async () => {
        (getOneAccountModule.getOneOrganizationAccount as jest.Mock)
          .mockResolvedValueOnce(null) // foundBefore
          .mockResolvedValueOnce(sampleFoundAccount); // foundAfter

        let pollCount = 0;
        mockSend.mockImplementation((command) => {
          if (command instanceof CreateAccountCommand) {
            return Promise.resolve({
              CreateAccountStatus: {
                Id: 'car-12345',
                State: 'IN_PROGRESS',
              },
            });
          }
          if (command instanceof DescribeCreateAccountStatusCommand) {
            pollCount++;
            if (pollCount < 2) {
              return Promise.resolve({
                CreateAccountStatus: {
                  Id: 'car-12345',
                  State: 'IN_PROGRESS',
                },
              });
            }
            return Promise.resolve({
              CreateAccountStatus: {
                Id: 'car-12345',
                State: 'SUCCEEDED',
                AccountId: '123456789012',
              },
            });
          }
          return Promise.resolve({});
        });

        const result = await setOrganizationAccount(
          { finsert: sampleDesiredAccount as any },
          context,
        );

        expect(pollCount).toBeGreaterThanOrEqual(2);
        expect(result.id).toBe('123456789012');
      });
    });

    when('creation fails', () => {
      then('we should throw HelpfulError', async () => {
        (
          getOneAccountModule.getOneOrganizationAccount as jest.Mock
        ).mockResolvedValue(null);

        mockSend.mockImplementation((command) => {
          if (command instanceof CreateAccountCommand) {
            return Promise.resolve({
              CreateAccountStatus: {
                Id: 'car-12345',
                State: 'FAILED',
                FailureReason: 'EMAIL_ALREADY_EXISTS',
              },
            });
          }
          return Promise.resolve({});
        });

        await expect(
          setOrganizationAccount(
            { finsert: sampleDesiredAccount as any },
            context,
          ),
        ).rejects.toThrow('Account creation failed');
      });
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
        setOrganizationAccount(
          { finsert: sampleDesiredAccount as any },
          context,
        ),
      ).rejects.toThrow('org manager auth required');
    });
  });

  given('organization mismatch', () => {
    then('we should throw BadRequestError', async () => {
      (
        getAwsOrganizationsClientModule.getAwsOrganizationsClient as jest.Mock
      ).mockResolvedValue({
        client: mockClient,
        organization: { managementAccount: { id: '999999999999' } },
      });

      await expect(
        setOrganizationAccount(
          { finsert: sampleDesiredAccount as any },
          context,
        ),
      ).rejects.toThrow('organization mismatch');
    });
  });

  given('finsert or upsert not provided', () => {
    then('we should throw BadRequestError', async () => {
      await expect(setOrganizationAccount({} as any, context)).rejects.toThrow(
        'finsert or upsert is required',
      );
    });
  });
});
