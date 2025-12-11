import { DeleteFunctionCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '../../.test/getMockedAwsApiContext';
import * as getLambdaModule from '../lambda/getOneLambda';
import { delLambdaVersion } from './delLambdaVersion';
import * as getLambdaVersionModule from './getOneLambdaVersion';

jest.mock('@aws-sdk/client-lambda');
jest.mock('../lambda/getOneLambda');
jest.mock('./getOneLambdaVersion');

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

describe('delLambdaVersion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getLambdaModule.getOneLambda as jest.Mock).mockResolvedValue(lambdaSample);
  });

  given('a version that exists', () => {
    when('delete is called', () => {
      then('it should delete the version', async () => {
        (
          getLambdaVersionModule.getOneLambdaVersion as jest.Mock
        ).mockResolvedValue({
          arn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function:5',
          version: '5',
          lambda: { name: 'test-function' },
          codeSha256: 'abc',
          configSha256: 'def',
        });

        mockSend.mockResolvedValue({});

        const result = await delLambdaVersion(
          {
            by: {
              unique: {
                lambda: { name: 'test-function' },
                codeSha256: 'abc',
                configSha256: 'def',
              },
            },
          },
          context,
        );

        expect(result).toEqual({ deleted: true });
        expect(mockSend).toHaveBeenCalledWith(
          expect.any(DeleteFunctionCommand),
        );
      });
    });
  });

  given('a version that does not exist', () => {
    when('delete is called', () => {
      then('it should return success (idempotent)', async () => {
        (
          getLambdaVersionModule.getOneLambdaVersion as jest.Mock
        ).mockResolvedValue(null);

        const result = await delLambdaVersion(
          {
            by: {
              unique: {
                lambda: { name: 'test-function' },
                codeSha256: 'abc',
                configSha256: 'def',
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

  given('aws returns function not found during delete', () => {
    when('delete is called', () => {
      then('it should return success (idempotent)', async () => {
        (
          getLambdaVersionModule.getOneLambdaVersion as jest.Mock
        ).mockResolvedValue({
          arn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function:5',
          version: '5',
          lambda: { name: 'test-function' },
          codeSha256: 'abc',
          configSha256: 'def',
        });

        const error = new Error('Function not found: test-function:5');
        mockSend.mockRejectedValue(error);

        const result = await delLambdaVersion(
          {
            by: {
              unique: {
                lambda: { name: 'test-function' },
                codeSha256: 'abc',
                configSha256: 'def',
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
