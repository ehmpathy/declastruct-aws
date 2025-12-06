import {
  DescribeAccountCommand,
  ListAccountsCommand,
  ListTagsForResourceCommand,
  type OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { BadRequestError } from 'helpful-errors';
import { given, then, when } from 'test-fns';
import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import * as getAwsOrganizationsClientModule from '../../access/sdks/getAwsOrganizationsClient';
import { getOneOrganizationAccount } from './getOneOrganizationAccount';

jest.mock('../../access/sdks/getAwsOrganizationsClient');

const mockSend = jest.fn();
const mockClient = { send: mockSend } as unknown as OrganizationsClient;

const context = getSampleAwsApiContext();

const sampleAwsAccount = {
  Id: '123456789012',
  Arn: 'arn:aws:organizations::111111111111:account/o-abc123xyz789/123456789012',
  Name: 'test-account',
  Email: 'test@example.com',
  Status: 'ACTIVE',
  JoinedMethod: 'CREATED',
  JoinedTimestamp: new Date('2024-01-15T10:30:00Z'),
};

describe('getOneOrganizationAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // default: org manager auth succeeds
    (
      getAwsOrganizationsClientModule.getAwsOrganizationsClient as jest.Mock
    ).mockResolvedValue({
      client: mockClient,
      organization: { id: 'o-abc123xyz789' },
    });
  });

  given('a by.primary lookup', () => {
    when('the account exists', () => {
      then('we should return the account', async () => {
        mockSend.mockImplementation((command) => {
          if (command instanceof DescribeAccountCommand) {
            return Promise.resolve({ Account: sampleAwsAccount });
          }
          if (command instanceof ListTagsForResourceCommand) {
            return Promise.resolve({ Tags: [{ Key: 'Env', Value: 'prod' }] });
          }
          return Promise.resolve({});
        });

        const result = await getOneOrganizationAccount(
          { by: { primary: { id: '123456789012' } } },
          context,
        );

        expect(result).not.toBeNull();
        expect(result?.id).toBe('123456789012');
        expect(result?.tags).toEqual({ Env: 'prod' });
      });
    });

    when('the account does not exist', () => {
      then('we should return null', async () => {
        mockSend.mockImplementation((command) => {
          if (command instanceof DescribeAccountCommand) {
            const error = new Error('Account not found');
            error.name = 'AccountNotFoundException';
            throw error;
          }
          return Promise.resolve({});
        });

        const result = await getOneOrganizationAccount(
          { by: { primary: { id: '999999999999' } } },
          context,
        );

        expect(result).toBeNull();
      });
    });
  });

  given('a by.unique lookup', () => {
    when('the account exists', () => {
      then('we should find it by email', async () => {
        mockSend.mockImplementation((command) => {
          if (command instanceof ListAccountsCommand) {
            return Promise.resolve({ Accounts: [sampleAwsAccount] });
          }
          if (command instanceof DescribeAccountCommand) {
            return Promise.resolve({ Account: sampleAwsAccount });
          }
          if (command instanceof ListTagsForResourceCommand) {
            return Promise.resolve({ Tags: [] });
          }
          return Promise.resolve({});
        });

        const result = await getOneOrganizationAccount(
          { by: { unique: { email: 'test@example.com' } } },
          context,
        );

        expect(result).not.toBeNull();
        expect(result?.email).toBe('test@example.com');
      });
    });

    when('the account does not exist', () => {
      then('we should return null', async () => {
        mockSend.mockImplementation((command) => {
          if (command instanceof ListAccountsCommand) {
            return Promise.resolve({ Accounts: [] });
          }
          return Promise.resolve({});
        });

        const result = await getOneOrganizationAccount(
          { by: { unique: { email: 'notfound@example.com' } } },
          context,
        );

        expect(result).toBeNull();
      });
    });
  });

  given('a by.ref lookup', () => {
    when('ref is a primary key', () => {
      then('we should route to by.primary', async () => {
        mockSend.mockImplementation((command) => {
          if (command instanceof DescribeAccountCommand) {
            return Promise.resolve({ Account: sampleAwsAccount });
          }
          if (command instanceof ListTagsForResourceCommand) {
            return Promise.resolve({ Tags: [] });
          }
          return Promise.resolve({});
        });

        const result = await getOneOrganizationAccount(
          { by: { ref: { id: '123456789012' } } },
          context,
        );

        expect(result).not.toBeNull();
        expect(result?.id).toBe('123456789012');
      });
    });

    when('ref is a unique key', () => {
      then('we should route to by.unique', async () => {
        mockSend.mockImplementation((command) => {
          if (command instanceof ListAccountsCommand) {
            return Promise.resolve({ Accounts: [sampleAwsAccount] });
          }
          if (command instanceof DescribeAccountCommand) {
            return Promise.resolve({ Account: sampleAwsAccount });
          }
          if (command instanceof ListTagsForResourceCommand) {
            return Promise.resolve({ Tags: [] });
          }
          return Promise.resolve({});
        });

        const result = await getOneOrganizationAccount(
          { by: { ref: { email: 'test@example.com' } } },
          context,
        );

        expect(result).not.toBeNull();
        expect(result?.email).toBe('test@example.com');
      });
    });
  });

  given('no org manager auth', () => {
    when('getAwsOrganizationsClient throws', () => {
      then('we should throw BadRequestError', async () => {
        (
          getAwsOrganizationsClientModule.getAwsOrganizationsClient as jest.Mock
        ).mockRejectedValue(
          new BadRequestError(
            'org manager auth required to use organizations client',
          ),
        );

        await expect(
          getOneOrganizationAccount(
            { by: { primary: { id: '123456789012' } } },
            context,
          ),
        ).rejects.toThrow('org manager auth required');
      });
    });
  });
});
