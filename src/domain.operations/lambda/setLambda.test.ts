import {
  LambdaClient,
  CreateFunctionCommand,
  UpdateFunctionConfigurationCommand,
} from '@aws-sdk/client-lambda';
import * as fs from 'fs/promises';
import * as path from 'path';
import { VisualogicContext } from 'visualogic';

import { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsLambda } from '../../domain.objects/DeclaredAwsLambda';
import * as castModule from './castToDeclaredAwsLambda';
import * as getLambdaModule from './getLambda';
import { setLambda } from './setLambda';

jest.mock('fs/promises');
jest.mock('@aws-sdk/client-lambda');
jest.mock('./castToDeclaredAwsLambda');
jest.mock('./getLambda');

const mockSend = jest.fn();
(LambdaClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context: ContextAwsApi & VisualogicContext = {
  aws: {
    credentials: { region: 'us-east-1' },
    cache: { DeclaredAwsVpcTunnel: { processes: { dir: '/tmp/tunnels' } } },
  },
  log: console,
};

const lambdaSample: DeclaredAwsLambda & { codeZipUri: string } = {
  name: 'test-function',
  qualifier: null,
  runtime: 'nodejs18.x',
  role: 'arn:aws:iam::123456789012:role/lambda-role',
  handler: 'index.handler',
  timeout: 30,
  memory: 128,
  envars: {},
  codeZipUri: './src/__test_assets__/lambda.sample.zip',
};

describe('setLambda', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns early for finsert if lambda already exists (before)', async () => {
    const before = { ...lambdaSample, arn: 'arn:aws:lambda:...' };
    (getLambdaModule.getLambda as jest.Mock).mockResolvedValue(before);

    const result = await setLambda({ finsert: lambdaSample }, context);
    expect(result).toBe(before);
    expect(getLambdaModule.getLambda).toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('updates lambda if upsert and lambda exists (before)', async () => {
    const before = { ...lambdaSample, arn: 'arn:aws:lambda:...' };
    (getLambdaModule.getLambda as jest.Mock).mockResolvedValue(before);
    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('zipcontent'));

    const lambdaResponse = {
      FunctionName: 'test-function',
      FunctionArn: 'arn',
      Version: '1',
      CodeSha256: 'abc',
    };

    mockSend.mockResolvedValue(lambdaResponse);
    (castModule.castToDeclaredAwsLambda as jest.Mock).mockReturnValue({
      ...lambdaSample,
      arn: 'arn',
      codeSha256: 'abc',
      qualifier: '1',
    });

    const result = await setLambda({ upsert: lambdaSample }, context);

    expect(getLambdaModule.getLambda).toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledWith(
      expect.any(UpdateFunctionConfigurationCommand),
    );
    expect(result.name).toEqual('test-function');
  });

  it('creates lambda if it does not exist (before = null)', async () => {
    (getLambdaModule.getLambda as jest.Mock).mockResolvedValue(null);
    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('zipcontent'));

    const lambdaResponse = {
      FunctionName: 'test-function',
      FunctionArn: 'arn',
      Version: '1',
      CodeSha256: 'def',
    };

    mockSend.mockResolvedValue(lambdaResponse);
    (castModule.castToDeclaredAwsLambda as jest.Mock).mockReturnValue({
      ...lambdaSample,
      arn: 'arn',
      codeSha256: 'def',
      qualifier: '1',
    });

    const result = await setLambda({ finsert: lambdaSample }, context);

    expect(getLambdaModule.getLambda).toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledWith(expect.any(CreateFunctionCommand));
    expect(result.codeSha256).toEqual('def');
  });

  it('reads from disk using codeZipUri', async () => {
    (getLambdaModule.getLambda as jest.Mock).mockResolvedValue(null);
    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('zipcontent'));
    mockSend.mockResolvedValue({});
    (castModule.castToDeclaredAwsLambda as jest.Mock).mockReturnValue(
      lambdaSample,
    );

    await setLambda({ upsert: lambdaSample }, context);

    expect(fs.readFile).toHaveBeenCalledWith(
      path.resolve(lambdaSample.codeZipUri),
    );
  });
});
