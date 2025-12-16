import {
  GetOpenIDConnectProviderCommand,
  IAMClient,
  ListOpenIDConnectProvidersCommand,
} from '@aws-sdk/client-iam';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import * as castModule from './castIntoDeclaredAwsIamOidcProvider';
import { getOneIamOidcProvider } from './getOneIamOidcProvider';

jest.mock('@aws-sdk/client-iam');
jest.mock('./castIntoDeclaredAwsIamOidcProvider');

const mockSend = jest.fn();
(IAMClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

describe('getOneIamOidcProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('a provider ref by primary', () => {
    then('we should call GetOpenIDConnectProviderCommand', async () => {
      const arn =
        'arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com';
      const providerResponse = {
        Url: 'token.actions.githubusercontent.com',
        ClientIDList: ['sts.amazonaws.com'],
        ThumbprintList: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
        Tags: [],
      };

      mockSend.mockResolvedValue(providerResponse);
      (
        castModule.castIntoDeclaredAwsIamOidcProvider as jest.Mock
      ).mockReturnValue({
        arn,
        url: 'https://token.actions.githubusercontent.com',
        clientIds: ['sts.amazonaws.com'],
        thumbprints: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
      });

      const result = await getOneIamOidcProvider(
        { by: { primary: { arn } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(GetOpenIDConnectProviderCommand),
      );
      expect(result).not.toBeNull();
      expect(result?.arn).toBe(arn);
    });
  });

  given('a provider ref by unique', () => {
    then('we should list providers and find matching url', async () => {
      const arn =
        'arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com';

      // mock list response
      mockSend.mockResolvedValueOnce({
        OpenIDConnectProviderList: [{ Arn: arn }],
      });

      // mock get details response
      mockSend.mockResolvedValueOnce({
        Url: 'token.actions.githubusercontent.com',
        ClientIDList: ['sts.amazonaws.com'],
        ThumbprintList: [],
      });

      (
        castModule.castIntoDeclaredAwsIamOidcProvider as jest.Mock
      ).mockReturnValue({
        arn,
        url: 'https://token.actions.githubusercontent.com',
        clientIds: ['sts.amazonaws.com'],
        thumbprints: [],
      });

      const result = await getOneIamOidcProvider(
        {
          by: {
            unique: { url: 'https://token.actions.githubusercontent.com' },
          },
        },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(ListOpenIDConnectProvidersCommand),
      );
      expect(result).not.toBeNull();
    });
  });

  given('a provider ref by ref (generic)', () => {
    then('we should route unique refs to lookup', async () => {
      const arn =
        'arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com';

      mockSend.mockResolvedValueOnce({
        OpenIDConnectProviderList: [{ Arn: arn }],
      });
      mockSend.mockResolvedValueOnce({
        Url: 'token.actions.githubusercontent.com',
        ClientIDList: ['sts.amazonaws.com'],
        ThumbprintList: [],
      });

      (
        castModule.castIntoDeclaredAwsIamOidcProvider as jest.Mock
      ).mockReturnValue({
        arn,
        url: 'https://token.actions.githubusercontent.com',
      });

      const result = await getOneIamOidcProvider(
        { by: { ref: { url: 'https://token.actions.githubusercontent.com' } } },
        context,
      );

      expect(result).not.toBeNull();
    });

    then('we should route primary refs to lookup', async () => {
      const arn =
        'arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com';

      mockSend.mockResolvedValue({
        Url: 'token.actions.githubusercontent.com',
        ClientIDList: ['sts.amazonaws.com'],
        ThumbprintList: [],
      });

      (
        castModule.castIntoDeclaredAwsIamOidcProvider as jest.Mock
      ).mockReturnValue({ arn });

      const result = await getOneIamOidcProvider(
        { by: { ref: { arn } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(GetOpenIDConnectProviderCommand),
      );
      expect(result).not.toBeNull();
    });
  });

  given('a provider that does not exist', () => {
    then('we should return null for NoSuchEntityException', async () => {
      const error = new Error('Provider not found');
      error.name = 'NoSuchEntityException';
      mockSend.mockRejectedValue(error);

      const result = await getOneIamOidcProvider(
        {
          by: {
            primary: {
              arn: 'arn:aws:iam::123456789012:oidc-provider/nonexistent',
            },
          },
        },
        context,
      );

      expect(result).toBeNull();
    });

    then('we should return null when url not found in list', async () => {
      mockSend.mockResolvedValueOnce({
        OpenIDConnectProviderList: [],
      });

      const result = await getOneIamOidcProvider(
        { by: { unique: { url: 'https://nonexistent.example.com' } } },
        context,
      );

      expect(result).toBeNull();
    });
  });
});
