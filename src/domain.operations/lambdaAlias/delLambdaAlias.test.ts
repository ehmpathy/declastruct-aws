import { DeleteAliasCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';
import * as getLambdaModule from '@src/domain.operations/lambda/getOneLambda';

import { delLambdaAlias } from './delLambdaAlias';
import * as getLambdaAliasModule from './getOneLambdaAlias';

jest.mock('@aws-sdk/client-lambda');
jest.mock('../lambda/getOneLambda');
jest.mock('./getOneLambdaAlias');

const mockSend = jest.fn();
(LambdaClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

const lambdaSample = {
  name: 'test-function',

  runtime: 'nodejs18.x',
  role: 'arn:aws:iam::123456789012:role/lambda-role',
  handler: 'index.handler',
  timeout: 30,
  memory: 128,
  envars: {},
};

describe('delLambdaAlias', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getLambdaModule.getOneLambda as jest.Mock).mockResolvedValue(lambdaSample);
  });

  given('an alias that exists', () => {
    when('delete is called', () => {
      then('it should delete the alias', async () => {
        (getLambdaAliasModule.getOneLambdaAlias as jest.Mock).mockResolvedValue(
          {
            arn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function:LIVE',
            name: 'LIVE',
            lambda: { name: 'test-function' },
            version: {
              lambda: { name: 'test-function' },
              codeSha256: 'abc',
              configSha256: 'def',
            },
          },
        );

        mockSend.mockResolvedValue({});

        const result = await delLambdaAlias(
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

        expect(result).toEqual({ deleted: true });
        expect(mockSend).toHaveBeenCalledWith(expect.any(DeleteAliasCommand));
      });
    });
  });

  given('an alias that does not exist', () => {
    when('delete is called', () => {
      then('it should return success (idempotent)', async () => {
        (getLambdaAliasModule.getOneLambdaAlias as jest.Mock).mockResolvedValue(
          null,
        );

        const result = await delLambdaAlias(
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

        expect(result).toEqual({ deleted: true });
        expect(mockSend).not.toHaveBeenCalled();
      });
    });
  });

  given('aws returns resource not found during delete', () => {
    when('delete is called', () => {
      then('it should return success (idempotent)', async () => {
        (getLambdaAliasModule.getOneLambdaAlias as jest.Mock).mockResolvedValue(
          {
            arn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function:LIVE',
            name: 'LIVE',
            lambda: { name: 'test-function' },
            version: {
              lambda: { name: 'test-function' },
              codeSha256: 'abc',
              configSha256: 'def',
            },
          },
        );

        const error = new Error('ResourceNotFoundException');
        error.name = 'ResourceNotFoundException';
        mockSend.mockRejectedValue(error);

        const result = await delLambdaAlias(
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

        expect(result).toEqual({ deleted: true });
      });
    });
  });
});
