import {
  CreateAliasCommand,
  LambdaClient,
  UpdateAliasCommand,
} from '@aws-sdk/client-lambda';
import { given, then, when } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import { DeclaredAwsLambdaVersionDao } from '../../access/daos/DeclaredAwsLambdaVersionDao';
import type { DeclaredAwsLambdaAlias } from '../../domain.objects/DeclaredAwsLambdaAlias';
import * as getLambdaModule from '../lambda/getOneLambda';
import * as getLambdaAliasModule from './getOneLambdaAlias';
import { setLambdaAlias } from './setLambdaAlias';

jest.mock('@aws-sdk/client-lambda');
jest.mock('../lambda/getOneLambda');
jest.mock('./getOneLambdaAlias');
jest.mock('../../access/daos/DeclaredAwsLambdaVersionDao');

const mockSend = jest.fn();
(LambdaClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getSampleAwsApiContext();

const aliasSample: DeclaredAwsLambdaAlias = {
  name: 'LIVE',
  lambda: { name: 'test-function' },
  version: {
    lambda: { name: 'test-function' },
    codeSha256: 'abc',
    configSha256: 'def',
  },
};

const lambdaSample = {
  name: 'test-function',

  runtime: 'nodejs18.x',
  role: 'arn:aws:iam::123456789012:role/lambda-role',
  handler: 'index.handler',
  timeout: 30,
  memory: 128,
  envars: {},
};

const versionSample = {
  arn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function:5',
  version: '5',
  lambda: { name: 'test-function' },
  codeSha256: 'abc',
  configSha256: 'def',
};

describe('setLambdaAlias', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getLambdaModule.getOneLambda as jest.Mock).mockResolvedValue(lambdaSample);
    (DeclaredAwsLambdaVersionDao.get.byRef as jest.Mock).mockResolvedValue(
      versionSample,
    );
  });

  given('an alias that does not exist', () => {
    when('finsert is called', () => {
      then('it should create the alias', async () => {
        (getLambdaAliasModule.getOneLambdaAlias as jest.Mock).mockResolvedValue(
          null,
        );

        mockSend.mockResolvedValue({
          AliasArn:
            'arn:aws:lambda:us-east-1:123456789012:function:test-function:LIVE',
          Name: 'LIVE',
          FunctionVersion: '5',
        });

        const result = await setLambdaAlias({ finsert: aliasSample }, context);

        expect(result.name).toBe('LIVE');
        expect(mockSend).toHaveBeenCalledWith(expect.any(CreateAliasCommand));
      });
    });
  });

  given('an alias that already exists with same version', () => {
    when('finsert is called', () => {
      then('it should return the existing alias (idempotent)', async () => {
        const existingAlias = {
          ...aliasSample,
          arn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function:LIVE',
        };
        (getLambdaAliasModule.getOneLambdaAlias as jest.Mock).mockResolvedValue(
          existingAlias,
        );

        mockSend.mockResolvedValue({
          FunctionVersion: '5',
        });

        const result = await setLambdaAlias({ finsert: aliasSample }, context);

        expect(result).toBe(existingAlias);
      });
    });
  });

  given('an alias that already exists with different version', () => {
    when('finsert is called', () => {
      then('it should throw BadRequestError', async () => {
        const existingAlias = {
          ...aliasSample,
          arn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function:LIVE',
        };
        (getLambdaAliasModule.getOneLambdaAlias as jest.Mock).mockResolvedValue(
          existingAlias,
        );

        mockSend.mockResolvedValue({
          FunctionVersion: '4', // different version
        });

        await expect(
          setLambdaAlias({ finsert: aliasSample }, context),
        ).rejects.toThrow('alias exists with different version');
      });
    });

    when('upsert is called', () => {
      then('it should update the alias to point to new version', async () => {
        const existingAlias = {
          ...aliasSample,
          arn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function:LIVE',
        };
        (getLambdaAliasModule.getOneLambdaAlias as jest.Mock).mockResolvedValue(
          existingAlias,
        );

        mockSend.mockResolvedValue({
          AliasArn:
            'arn:aws:lambda:us-east-1:123456789012:function:test-function:LIVE',
          Name: 'LIVE',
          FunctionVersion: '5',
        });

        const result = await setLambdaAlias({ upsert: aliasSample }, context);

        expect(result.name).toBe('LIVE');
        expect(mockSend).toHaveBeenCalledWith(expect.any(UpdateAliasCommand));
      });
    });
  });

  given('a lambda that does not exist', () => {
    when('set is called', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        (getLambdaModule.getOneLambda as jest.Mock).mockResolvedValue(null);

        await expect(
          setLambdaAlias({ finsert: aliasSample }, context),
        ).rejects.toThrow('lambda not found');
      });
    });
  });

  given('a version that does not exist', () => {
    when('set is called', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        (DeclaredAwsLambdaVersionDao.get.byRef as jest.Mock).mockResolvedValue(
          null,
        );

        await expect(
          setLambdaAlias({ finsert: aliasSample }, context),
        ).rejects.toThrow('version not found');
      });
    });
  });
});
