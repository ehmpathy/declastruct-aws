import { GetAliasCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { given, then, when } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import * as getLambdaModule from '../lambda/getOneLambda';
import { getOneLambdaAlias } from './getOneLambdaAlias';

jest.mock('@aws-sdk/client-lambda');
jest.mock('../lambda/getOneLambda');

const mockSend = jest.fn();
(LambdaClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getSampleAwsApiContext();

describe('getOneLambdaAlias', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('an alias that exists', () => {
    when('fetched by unique', () => {
      then('it should return the alias', async () => {
        (getLambdaModule.getOneLambda as jest.Mock).mockResolvedValue({
          name: 'test-function',
        });

        // mock returns alias first, then version config
        mockSend
          .mockResolvedValueOnce({
            AliasArn:
              'arn:aws:lambda:us-east-1:123456789012:function:test-function:LIVE',
            Name: 'LIVE',
            FunctionVersion: '5',
            Description: 'Production alias',
          })
          .mockResolvedValueOnce({
            FunctionName: 'test-function',
            Handler: 'index.handler',
            Runtime: 'nodejs18.x',
            MemorySize: 128,
            Timeout: 30,
            Role: 'arn:aws:iam::123456789012:role/test-role',
            Environment: { Variables: {} },
            CodeSha256: 'abc123',
          });

        const result = await getOneLambdaAlias(
          {
            by: {
              unique: {
                lambda: { name: 'test-function' },
                name: 'LIVE',
              },
            },
          },
          context,
        );

        expect(result).not.toBeNull();
        expect(result?.name).toBe('LIVE');
        expect(result?.arn).toBe(
          'arn:aws:lambda:us-east-1:123456789012:function:test-function:LIVE',
        );
        expect(mockSend).toHaveBeenCalledWith(expect.any(GetAliasCommand));
      });
    });

    when('fetched by primary (arn)', () => {
      then('it should extract function and alias name from arn', async () => {
        // mock returns alias first, then version config
        mockSend
          .mockResolvedValueOnce({
            AliasArn:
              'arn:aws:lambda:us-east-1:123456789012:function:test-function:LIVE',
            Name: 'LIVE',
            FunctionVersion: '5',
          })
          .mockResolvedValueOnce({
            FunctionName: 'test-function',
            Handler: 'index.handler',
            Runtime: 'nodejs18.x',
            MemorySize: 128,
            Timeout: 30,
            Role: 'arn:aws:iam::123456789012:role/test-role',
            Environment: { Variables: {} },
            CodeSha256: 'abc123',
          });

        const result = await getOneLambdaAlias(
          {
            by: {
              primary: {
                arn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function:LIVE',
              },
            },
          },
          context,
        );

        expect(result).not.toBeNull();
        expect(result?.name).toBe('LIVE');
      });
    });
  });

  given('an alias that does not exist', () => {
    when('fetched', () => {
      then('it should return null', async () => {
        (getLambdaModule.getOneLambda as jest.Mock).mockResolvedValue({
          name: 'test-function',
        });

        const error = new Error('ResourceNotFoundException');
        error.name = 'ResourceNotFoundException';
        mockSend.mockRejectedValue(error);

        const result = await getOneLambdaAlias(
          {
            by: {
              unique: {
                lambda: { name: 'test-function' },
                name: 'nonexistent',
              },
            },
          },
          context,
        );

        expect(result).toBeNull();
      });
    });
  });

  given('a lambda that does not exist', () => {
    when('fetched', () => {
      then('it should return null', async () => {
        (getLambdaModule.getOneLambda as jest.Mock).mockResolvedValue(null);

        const result = await getOneLambdaAlias(
          {
            by: {
              unique: {
                lambda: { name: 'nonexistent-function' },
                name: 'LIVE',
              },
            },
          },
          context,
        );

        expect(result).toBeNull();
      });
    });
  });
});
