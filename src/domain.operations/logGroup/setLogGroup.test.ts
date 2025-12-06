import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  DeleteRetentionPolicyCommand,
  PutRetentionPolicyCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { given, then, when } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import type { DeclaredAwsLogGroup } from '../../domain.objects/DeclaredAwsLogGroup';
import * as getOneLogGroupModule from './getOneLogGroup';
import { setLogGroup } from './setLogGroup';

jest.mock('@aws-sdk/client-cloudwatch-logs');
jest.mock('./getOneLogGroup');

const mockSend = jest.fn();
(CloudWatchLogsClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getSampleAwsApiContext();

const logGroupSample: DeclaredAwsLogGroup = {
  name: '/aws/lambda/test-function',
  class: 'STANDARD',
  kmsKeyId: null,
  retentionInDays: 30,
};

describe('setLogGroup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('a log group that does not exist', () => {
    when('finsert is called', () => {
      then('it should create the log group and set retention', async () => {
        (getOneLogGroupModule.getOneLogGroup as jest.Mock)
          .mockResolvedValueOnce(null) // foundBefore
          .mockResolvedValueOnce({
            ...logGroupSample,
            arn: 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/test-function',
          }); // foundAfter

        mockSend.mockResolvedValue({});

        const result = await setLogGroup({ finsert: logGroupSample }, context);

        expect(result.name).toBe('/aws/lambda/test-function');
        expect(mockSend).toHaveBeenCalledWith(
          expect.any(CreateLogGroupCommand),
        );
        expect(mockSend).toHaveBeenCalledWith(
          expect.any(PutRetentionPolicyCommand),
        );
      });
    });

    when('upsert is called', () => {
      then('it should create the log group and set retention', async () => {
        (getOneLogGroupModule.getOneLogGroup as jest.Mock)
          .mockResolvedValueOnce(null) // foundBefore
          .mockResolvedValueOnce({
            ...logGroupSample,
            arn: 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/test-function',
          }); // foundAfter

        mockSend.mockResolvedValue({});

        const result = await setLogGroup({ upsert: logGroupSample }, context);

        expect(result.name).toBe('/aws/lambda/test-function');
        expect(mockSend).toHaveBeenCalledWith(
          expect.any(CreateLogGroupCommand),
        );
        expect(mockSend).toHaveBeenCalledWith(
          expect.any(PutRetentionPolicyCommand),
        );
      });
    });
  });

  given('a log group that already exists', () => {
    when('finsert is called', () => {
      then('it should return the found log group (idempotent)', async () => {
        const foundLogGroup = {
          ...logGroupSample,
          arn: 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/test-function',
        };
        (getOneLogGroupModule.getOneLogGroup as jest.Mock).mockResolvedValue(
          foundLogGroup,
        );

        const result = await setLogGroup({ finsert: logGroupSample }, context);

        expect(result).toBe(foundLogGroup);
        expect(mockSend).not.toHaveBeenCalled();
      });
    });

    when('upsert is called with different retention', () => {
      then('it should update the retention policy', async () => {
        const foundLogGroup = {
          ...logGroupSample,
          retentionInDays: 14, // different from desired 30
          arn: 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/test-function',
        };
        (getOneLogGroupModule.getOneLogGroup as jest.Mock)
          .mockResolvedValueOnce(foundLogGroup) // foundBefore
          .mockResolvedValueOnce({ ...foundLogGroup, retentionInDays: 30 }); // foundAfter

        mockSend.mockResolvedValue({});

        const result = await setLogGroup({ upsert: logGroupSample }, context);

        expect(result.retentionInDays).toBe(30);
        expect(mockSend).not.toHaveBeenCalledWith(
          expect.any(CreateLogGroupCommand),
        );
        expect(mockSend).toHaveBeenCalledWith(
          expect.any(PutRetentionPolicyCommand),
        );
      });
    });

    when('upsert is called with null retention', () => {
      then('it should delete the retention policy', async () => {
        const foundLogGroup = {
          ...logGroupSample,
          retentionInDays: 30,
          arn: 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/test-function',
        };
        (getOneLogGroupModule.getOneLogGroup as jest.Mock)
          .mockResolvedValueOnce(foundLogGroup) // foundBefore
          .mockResolvedValueOnce({ ...foundLogGroup, retentionInDays: null }); // foundAfter

        mockSend.mockResolvedValue({});

        const result = await setLogGroup(
          { upsert: { ...logGroupSample, retentionInDays: null } },
          context,
        );

        expect(result.retentionInDays).toBe(null);
        expect(mockSend).toHaveBeenCalledWith(
          expect.any(DeleteRetentionPolicyCommand),
        );
      });
    });

    when('upsert is called with same retention', () => {
      then('it should skip updating retention (no-op)', async () => {
        const foundLogGroup = {
          ...logGroupSample,
          arn: 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/test-function',
        };
        (getOneLogGroupModule.getOneLogGroup as jest.Mock)
          .mockResolvedValueOnce(foundLogGroup) // foundBefore
          .mockResolvedValueOnce(foundLogGroup); // foundAfter

        const result = await setLogGroup({ upsert: logGroupSample }, context);

        expect(result.retentionInDays).toBe(30);
        expect(mockSend).not.toHaveBeenCalled();
      });
    });
  });
});
