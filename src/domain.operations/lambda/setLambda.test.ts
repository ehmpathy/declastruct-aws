import {
  CreateFunctionCommand,
  LambdaClient,
  UpdateFunctionConfigurationCommand,
} from '@aws-sdk/client-lambda';
import * as fs from 'fs/promises';
import type { Hash } from 'hash-fns';
import * as path from 'path';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';
import type { DeclaredAwsLambda } from '@src/domain.objects/DeclaredAwsLambda';

import * as castModule from './castIntoDeclaredAwsLambda';
import * as getLambdaModule from './getOneLambda';
import { setLambda } from './setLambda';

jest.mock('fs/promises');
jest.mock('@aws-sdk/client-lambda');
jest.mock('./castIntoDeclaredAwsLambda');
jest.mock('./getOneLambda');

const mockSend = jest.fn();
(LambdaClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

const lambdaSample: DeclaredAwsLambda = {
  name: 'test-function',

  runtime: 'nodejs18.x',
  role: { name: 'lambda-role' },
  handler: 'index.handler',
  timeout: 30,
  memory: 128,
  envars: {},
  code: {
    zipUri: './src/.test/lambda.sample.zip',
    hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08' as Hash,
  },
};

describe('setLambda', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns early for findsert if lambda already exists (before)', async () => {
    const before = { ...lambdaSample, arn: 'arn:aws:lambda:...' };
    (getLambdaModule.getOneLambda as jest.Mock).mockResolvedValue(before);

    const result = await setLambda({ findsert: lambdaSample }, context);
    expect(result).toBe(before);
    expect(getLambdaModule.getOneLambda).toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('updates lambda if upsert and lambda exists (before)', async () => {
    const before = { ...lambdaSample, arn: 'arn:aws:lambda:...' };
    (getLambdaModule.getOneLambda as jest.Mock).mockResolvedValue(before);
    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('zipcontent'));

    const lambdaResponse = {
      FunctionName: 'test-function',
      FunctionArn: 'arn',
      Version: '1',
      CodeSha256: 'abc',
    };

    mockSend.mockResolvedValue(lambdaResponse);
    (castModule.castIntoDeclaredAwsLambda as jest.Mock).mockReturnValue({
      ...lambdaSample,
      arn: 'arn',
      code: {
        zipUri: lambdaSample.code?.zipUri ?? null,
        hash: 'abc123def456' as Hash,
      },
    });

    const result = await setLambda({ upsert: lambdaSample }, context);

    expect(getLambdaModule.getOneLambda).toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledWith(
      expect.any(UpdateFunctionConfigurationCommand),
    );
    expect(result.name).toEqual('test-function');
  });

  it('creates lambda if it does not exist (before = null)', async () => {
    (getLambdaModule.getOneLambda as jest.Mock).mockResolvedValue(null);
    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('zipcontent'));

    const lambdaResponse = {
      FunctionName: 'test-function',
      FunctionArn: 'arn',
      Version: '1',
      CodeSha256: 'def',
    };

    mockSend.mockResolvedValue(lambdaResponse);
    (castModule.castIntoDeclaredAwsLambda as jest.Mock).mockReturnValue({
      ...lambdaSample,
      arn: 'arn',
      code: {
        zipUri: lambdaSample.code?.zipUri ?? null,
        hash: 'def789ghi012' as Hash,
      },
    });

    const result = await setLambda({ findsert: lambdaSample }, context);

    expect(getLambdaModule.getOneLambda).toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledWith(expect.any(CreateFunctionCommand));
    expect(result.code?.hash).toEqual('def789ghi012');
  });

  it('reads from disk using code.zipUri', async () => {
    (getLambdaModule.getOneLambda as jest.Mock).mockResolvedValue(null);
    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('zipcontent'));
    mockSend.mockResolvedValue({});
    (castModule.castIntoDeclaredAwsLambda as jest.Mock).mockReturnValue(
      lambdaSample,
    );

    await setLambda({ upsert: lambdaSample }, context);

    expect(fs.readFile).toHaveBeenCalledWith(
      path.resolve(lambdaSample.code!.zipUri!),
    );
  });
});
