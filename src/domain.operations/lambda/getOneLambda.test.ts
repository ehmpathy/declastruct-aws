import { GetFunctionCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { given, then } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import * as castModule from './castIntoDeclaredAwsLambda';
import { getOneLambda } from './getOneLambda';

jest.mock('@aws-sdk/client-lambda');
jest.mock('./castIntoDeclaredAwsLambda');

const mockSend = jest.fn();
(LambdaClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getSampleAwsApiContext();

describe('getOneLambda', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('a lambda ref by unique', () => {
    then('we should call GetFunctionConfigurationCommand', async () => {
      const lambdaResponse = {
        Configuration: {
          FunctionName: 'test-function',
          FunctionArn:
            'arn:aws:lambda:us-east-1:123456789012:function:test-function',
          Runtime: 'nodejs18.x',
          Role: 'arn:aws:iam::123456789012:role/lambda-role',
          Handler: 'index.handler',
          Timeout: 30,
          MemorySize: 128,
          Environment: { Variables: {} },
          CodeSize: 1024,
          CodeSha256: 'abc123',
          LastModified: '2024-01-01T00:00:00.000+0000',
        },
        Tags: { codeZipUri: 'path/to/code.zip' },
      };

      mockSend.mockResolvedValue(lambdaResponse);
      (castModule.castIntoDeclaredAwsLambda as jest.Mock).mockReturnValue({
        name: 'test-function',

        arn: lambdaResponse.Configuration.FunctionArn,
      });

      const result = await getOneLambda(
        { by: { unique: { name: 'test-function' } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(GetFunctionCommand));
      expect(result).not.toBeNull();
    });
  });

  given('a lambda ref by primary', () => {
    then('we should call GetFunctionCommand', async () => {
      const arn =
        'arn:aws:lambda:us-east-1:123456789012:function:test-function';
      const lambdaResponse = {
        Configuration: {
          FunctionName: 'test-function',
          FunctionArn: arn,
          Runtime: 'nodejs18.x',
          Role: 'arn:aws:iam::123456789012:role/lambda-role',
          Handler: 'index.handler',
          Timeout: 30,
          MemorySize: 128,
          Environment: { Variables: {} },
          CodeSize: 1024,
          CodeSha256: 'abc123',
          LastModified: '2024-01-01T00:00:00.000+0000',
        },
        Tags: {},
      };

      mockSend.mockResolvedValue(lambdaResponse);
      (castModule.castIntoDeclaredAwsLambda as jest.Mock).mockReturnValue({
        name: 'test-function',

        arn,
      });

      const result = await getOneLambda({ by: { primary: { arn } } }, context);

      expect(mockSend).toHaveBeenCalledWith(expect.any(GetFunctionCommand));
      expect(result).not.toBeNull();
    });
  });

  given('a lambda ref by ref (generic)', () => {
    then('we should route unique refs to lookup', async () => {
      const lambdaResponse = {
        Configuration: {
          FunctionName: 'test-function',
          FunctionArn:
            'arn:aws:lambda:us-east-1:123456789012:function:test-function',
          Runtime: 'nodejs18.x',
          Role: 'arn:aws:iam::123456789012:role/lambda-role',
          Handler: 'index.handler',
          Timeout: 30,
          MemorySize: 128,
          Environment: { Variables: {} },
          CodeSize: 1024,
          CodeSha256: 'abc123',
          LastModified: '2024-01-01T00:00:00.000+0000',
        },
        Tags: {},
      };

      mockSend.mockResolvedValue(lambdaResponse);
      (castModule.castIntoDeclaredAwsLambda as jest.Mock).mockReturnValue({
        name: 'test-function',

        arn: lambdaResponse.Configuration.FunctionArn,
      });

      // pass as a generic ref that looks like unique (has name field)
      const result = await getOneLambda(
        { by: { ref: { name: 'test-function' } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(GetFunctionCommand));
      expect(result).not.toBeNull();
    });

    then('we should route primary refs to lookup', async () => {
      const arn =
        'arn:aws:lambda:us-east-1:123456789012:function:test-function';
      const lambdaResponse = {
        Configuration: {
          FunctionName: 'test-function',
          FunctionArn: arn,
          Runtime: 'nodejs18.x',
          Role: 'arn:aws:iam::123456789012:role/lambda-role',
          Handler: 'index.handler',
          Timeout: 30,
          MemorySize: 128,
          Environment: { Variables: {} },
          CodeSize: 1024,
          CodeSha256: 'abc123',
          LastModified: '2024-01-01T00:00:00.000+0000',
        },
        Tags: {},
      };

      mockSend.mockResolvedValue(lambdaResponse);
      (castModule.castIntoDeclaredAwsLambda as jest.Mock).mockReturnValue({
        name: 'test-function',

        arn,
      });

      // pass as a generic ref that looks like primary (has arn field)
      const result = await getOneLambda({ by: { ref: { arn } } }, context);

      expect(mockSend).toHaveBeenCalledWith(expect.any(GetFunctionCommand));
      expect(result).not.toBeNull();
    });
  });

  given('a lambda that does not exist', () => {
    then('we should return null for ResourceNotFoundException', async () => {
      const error = new Error('Function not found');
      error.name = 'ResourceNotFoundException';
      mockSend.mockRejectedValue(error);

      const result = await getOneLambda(
        { by: { unique: { name: 'nonexistent-lambda' } } },
        context,
      );

      expect(result).toBeNull();
    });

    then('we should return null for "Function not found" message', async () => {
      const error = new Error('Function not found: arn:aws:lambda...');
      error.name = 'SomeOtherError';
      mockSend.mockRejectedValue(error);

      const result = await getOneLambda(
        { by: { unique: { name: 'nonexistent-lambda' } } },
        context,
      );

      expect(result).toBeNull();
    });

    then('we should return null for 404 status code', async () => {
      const error = new Error('Not found');
      error.name = 'Unknown';
      (error as { $metadata?: { httpStatusCode?: number } }).$metadata = {
        httpStatusCode: 404,
      };
      mockSend.mockRejectedValue(error);

      const result = await getOneLambda(
        { by: { unique: { name: 'nonexistent-lambda' } } },
        context,
      );

      expect(result).toBeNull();
    });
  });
});
