import {
  ListAccountsCommand,
  ListTagsForResourceCommand,
  type OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { BadRequestError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';
import * as getAwsOrganizationsClientModule from '@src/access/sdks/getAwsOrganizationsClient';

import { getAllOrganizationAccounts } from './getAllOrganizationAccounts';

jest.mock('../../access/sdks/getAwsOrganizationsClient');

const mockSend = jest.fn();
const mockClient = { send: mockSend } as unknown as OrganizationsClient;

const context = getMockedAwsApiContext();

const sampleAwsAccount = {
  Id: '123456789012',
  Arn: 'arn:aws:organizations::111111111111:account/o-abc123xyz789/123456789012',
  Name: 'test-account',
  Email: 'test@example.com',
  Status: 'ACTIVE',
  JoinedMethod: 'CREATED',
  JoinedTimestamp: new Date('2024-01-15T10:30:00Z'),
};

describe('getAllOrganizationAccounts', () => {
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

  given('accounts exist in the organization', () => {
    then('we should return all accounts', async () => {
      mockSend.mockImplementation((command) => {
        if (command instanceof ListAccountsCommand) {
          return Promise.resolve({
            Accounts: [sampleAwsAccount],
          });
        }
        if (command instanceof ListTagsForResourceCommand) {
          return Promise.resolve({ Tags: [{ Key: 'Env', Value: 'prod' }] });
        }
        return Promise.resolve({});
      });

      const result = await getAllOrganizationAccounts(
        { by: { auth: true } },
        context,
      );

      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0]?.id).toBe('123456789012');
      expect(result.accounts[0]?.tags).toEqual({ Env: 'prod' });
    });
  });

  given('no accounts exist', () => {
    then('we should return empty array', async () => {
      mockSend.mockImplementation((command) => {
        if (command instanceof ListAccountsCommand) {
          return Promise.resolve({ Accounts: [] });
        }
        return Promise.resolve({});
      });

      const result = await getAllOrganizationAccounts(
        { by: { auth: true } },
        context,
      );

      expect(result.accounts).toHaveLength(0);
    });
  });

  given('pagination is needed', () => {
    when('nextToken is returned', () => {
      then('we should return the nextToken', async () => {
        mockSend.mockImplementation((command) => {
          if (command instanceof ListAccountsCommand) {
            return Promise.resolve({
              Accounts: [sampleAwsAccount],
              NextToken: 'next-page-token',
            });
          }
          if (command instanceof ListTagsForResourceCommand) {
            return Promise.resolve({ Tags: [] });
          }
          return Promise.resolve({});
        });

        const result = await getAllOrganizationAccounts(
          { by: { auth: true }, page: { limit: 1 } },
          context,
        );

        expect(result.accounts).toHaveLength(1);
        expect(result.nextToken).toBe('next-page-token');
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
        getAllOrganizationAccounts({ by: { auth: true } }, context),
      ).rejects.toThrow('org manager auth required');
    });
  });

  given('an unexpected error occurs', () => {
    then('we should throw a HelpfulError', async () => {
      mockSend.mockRejectedValue(new Error('Service unavailable'));

      await expect(
        getAllOrganizationAccounts({ by: { auth: true } }, context),
      ).rejects.toThrow('aws.getAllOrganizationAccounts error');
    });
  });
});
