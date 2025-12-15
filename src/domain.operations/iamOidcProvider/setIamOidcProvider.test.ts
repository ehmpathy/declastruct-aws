import {
  CreateOpenIDConnectProviderCommand,
  IAMClient,
  UpdateOpenIDConnectProviderThumbprintCommand,
} from '@aws-sdk/client-iam';
import { given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '../../.test/getMockedAwsApiContext';
import * as getModule from './getOneIamOidcProvider';
import { setIamOidcProvider } from './setIamOidcProvider';

jest.mock('@aws-sdk/client-iam');
jest.mock('./getOneIamOidcProvider');

const mockSend = jest.fn();
(IAMClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

describe('setIamOidcProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('a provider that does not exist', () => {
    when('findsert is called', () => {
      then('it should create the provider', async () => {
        const arn =
          'arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com';

        // mock lookup returns null (not found)
        (getModule.getOneIamOidcProvider as jest.Mock)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            arn,
            url: 'https://token.actions.githubusercontent.com',
            clientIds: ['sts.amazonaws.com'],
            thumbprints: [],
          });

        // mock create response
        mockSend.mockResolvedValue({ OpenIDConnectProviderArn: arn });

        const result = await setIamOidcProvider(
          {
            findsert: {
              url: 'https://token.actions.githubusercontent.com',
              clientIds: ['sts.amazonaws.com'],
              thumbprints: [],
            },
          },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(
          expect.any(CreateOpenIDConnectProviderCommand),
        );
        expect(result.arn).toBe(arn);
      });
    });

    when('upsert is called', () => {
      then('it should create the provider', async () => {
        const arn =
          'arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com';

        (getModule.getOneIamOidcProvider as jest.Mock)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            arn,
            url: 'https://token.actions.githubusercontent.com',
            clientIds: ['sts.amazonaws.com'],
            thumbprints: [],
          });

        mockSend.mockResolvedValue({ OpenIDConnectProviderArn: arn });

        const result = await setIamOidcProvider(
          {
            upsert: {
              url: 'https://token.actions.githubusercontent.com',
              clientIds: ['sts.amazonaws.com'],
              thumbprints: [],
            },
          },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(
          expect.any(CreateOpenIDConnectProviderCommand),
        );
        expect(result.arn).toBe(arn);
      });
    });
  });

  given('a provider that already exists', () => {
    when('findsert is called', () => {
      then('it should return the existing provider (idempotent)', async () => {
        const arn =
          'arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com';
        const existing = {
          arn,
          url: 'https://token.actions.githubusercontent.com',
          clientIds: ['sts.amazonaws.com'],
          thumbprints: ['abc123'],
        };

        (getModule.getOneIamOidcProvider as jest.Mock).mockResolvedValue(
          existing,
        );

        const result = await setIamOidcProvider(
          {
            findsert: {
              url: 'https://token.actions.githubusercontent.com',
              clientIds: ['sts.amazonaws.com'],
              thumbprints: ['abc123'],
            },
          },
          context,
        );

        expect(mockSend).not.toHaveBeenCalledWith(
          expect.any(CreateOpenIDConnectProviderCommand),
        );
        expect(result).toEqual(existing);
      });
    });

    when('upsert is called with different thumbprints', () => {
      then('it should update the thumbprints', async () => {
        const arn =
          'arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com';
        const existing = {
          arn,
          url: 'https://token.actions.githubusercontent.com',
          clientIds: ['sts.amazonaws.com'],
          thumbprints: ['old-thumbprint'],
        };

        (getModule.getOneIamOidcProvider as jest.Mock)
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce({
            ...existing,
            thumbprints: ['new-thumbprint'],
          });

        mockSend.mockResolvedValue({});

        const result = await setIamOidcProvider(
          {
            upsert: {
              url: 'https://token.actions.githubusercontent.com',
              clientIds: ['sts.amazonaws.com'],
              thumbprints: ['new-thumbprint'],
            },
          },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(
          expect.any(UpdateOpenIDConnectProviderThumbprintCommand),
        );
        expect(result.thumbprints).toEqual(['new-thumbprint']);
      });
    });
  });
});
