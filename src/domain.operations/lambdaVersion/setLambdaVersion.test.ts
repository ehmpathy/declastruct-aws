import { LambdaClient, PublishVersionCommand } from '@aws-sdk/client-lambda';
import { given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';
import type { DeclaredAwsLambdaVersion } from '@src/domain.objects/DeclaredAwsLambdaVersion';
import * as getLambdaModule from '@src/domain.operations/lambda/getOneLambda';

import * as getLambdaVersionModule from './getOneLambdaVersion';
import { setLambdaVersion } from './setLambdaVersion';
import * as calcConfigModule from './utils/calcConfigSha256';

jest.mock('@aws-sdk/client-lambda');
jest.mock('../lambda/getOneLambda');
jest.mock('./getOneLambdaVersion');
jest.mock('./utils/calcConfigSha256');

const mockSend = jest.fn();
(LambdaClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

const versionSample: DeclaredAwsLambdaVersion = {
  lambda: { name: 'test-function' },
  codeSha256: 'abc123codesha',
  configSha256: 'def456configsha',
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

describe('setLambdaVersion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getLambdaModule.getOneLambda as jest.Mock).mockResolvedValue(lambdaSample);
    (calcConfigModule.calcConfigSha256 as jest.Mock).mockReturnValue(
      'def456configsha',
    );
  });

  given('a version that does not exist', () => {
    when('findsert is called', () => {
      then('it should publish a new version', async () => {
        (
          getLambdaVersionModule.getOneLambdaVersion as jest.Mock
        ).mockResolvedValue(null);

        mockSend.mockResolvedValue({
          FunctionArn:
            'arn:aws:lambda:us-east-1:123456789012:function:test-function:5',
          FunctionName: 'test-function',
          Version: '5',
          CodeSha256: 'abc123codesha',
          Handler: 'index.handler',
          Runtime: 'nodejs18.x',
          MemorySize: 128,
          Timeout: 30,
          Role: 'arn:aws:iam::123456789012:role/lambda-role',
          Environment: { Variables: {} },
        });

        const result = await setLambdaVersion(
          { findsert: versionSample },
          context,
        );

        expect(result.version).toBe('5');
        expect(mockSend).toHaveBeenCalledWith(
          expect.any(PublishVersionCommand),
        );
      });
    });
  });

  given('a version that already exists', () => {
    when('findsert is called', () => {
      then('it should return the existing version (idempotent)', async () => {
        const existingVersion = {
          ...versionSample,
          arn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function:5',
          version: '5',
        };
        (
          getLambdaVersionModule.getOneLambdaVersion as jest.Mock
        ).mockResolvedValue(existingVersion);

        const result = await setLambdaVersion(
          { findsert: versionSample },
          context,
        );

        expect(result).toBe(existingVersion);
        expect(mockSend).not.toHaveBeenCalled();
      });
    });

    when('upsert is called', () => {
      then(
        'it should return the existing version (versions are immutable)',
        async () => {
          const existingVersion = {
            ...versionSample,
            arn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function:5',
            version: '5',
          };
          (
            getLambdaVersionModule.getOneLambdaVersion as jest.Mock
          ).mockResolvedValue(existingVersion);

          const result = await setLambdaVersion(
            { upsert: versionSample },
            context,
          );

          expect(result).toBe(existingVersion);
          expect(mockSend).not.toHaveBeenCalled();
        },
      );
    });
  });

  given('a lambda that does not exist', () => {
    when('set is called', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        (
          getLambdaVersionModule.getOneLambdaVersion as jest.Mock
        ).mockResolvedValue(null);
        (getLambdaModule.getOneLambda as jest.Mock).mockResolvedValue(null);

        await expect(
          setLambdaVersion({ findsert: versionSample }, context),
        ).rejects.toThrow('lambda not found');
      });
    });
  });

  given('config hash mismatch after publish', () => {
    when('set is called', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        (
          getLambdaVersionModule.getOneLambdaVersion as jest.Mock
        ).mockResolvedValue(null);
        (calcConfigModule.calcConfigSha256 as jest.Mock).mockReturnValue(
          'different-hash', // mismatch
        );

        mockSend.mockResolvedValue({
          FunctionArn:
            'arn:aws:lambda:us-east-1:123456789012:function:test-function:5',
          FunctionName: 'test-function',
          Version: '5',
          CodeSha256: 'abc123codesha',
          Handler: 'index.handler',
          Runtime: 'nodejs18.x',
          MemorySize: 128,
          Timeout: 30,
          Role: 'arn:aws:iam::123456789012:role/lambda-role',
          Environment: { Variables: {} },
        });

        await expect(
          setLambdaVersion({ findsert: versionSample }, context),
        ).rejects.toThrow('config hash mismatch');
      });
    });
  });
});
