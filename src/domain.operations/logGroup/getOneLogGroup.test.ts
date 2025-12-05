import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { given, then } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import * as castModule from './castIntoDeclaredAwsLogGroup';
import { getOneLogGroup } from './getOneLogGroup';

jest.mock('@aws-sdk/client-cloudwatch-logs');
jest.mock('./castIntoDeclaredAwsLogGroup');

const mockSend = jest.fn();
(CloudWatchLogsClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getSampleAwsApiContext();

describe('getOneLogGroup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('a log group ref by unique', () => {
    then('we should call DescribeLogGroupsCommand', async () => {
      const logGroupResponse = {
        logGroups: [
          {
            arn: 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/test-function',
            logGroupName: '/aws/lambda/test-function',
            logGroupClass: 'STANDARD',
            creationTime: 1705323000000,
            storedBytes: 1073741824,
          },
        ],
      };

      mockSend.mockResolvedValue(logGroupResponse);
      (castModule.castIntoDeclaredAwsLogGroup as jest.Mock).mockReturnValue({
        name: '/aws/lambda/test-function',
        arn: logGroupResponse.logGroups?.[0]?.arn,
      });

      const result = await getOneLogGroup(
        { by: { unique: { name: '/aws/lambda/test-function' } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(DescribeLogGroupsCommand),
      );
      expect(result).not.toBeNull();
    });
  });

  given('a log group ref by primary', () => {
    then('we should call DescribeLogGroupsCommand with arn', async () => {
      const arn =
        'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/test-function';
      const logGroupResponse = {
        logGroups: [
          {
            arn,
            logGroupName: '/aws/lambda/test-function',
            logGroupClass: 'STANDARD',
          },
        ],
      };

      mockSend.mockResolvedValue(logGroupResponse);
      (castModule.castIntoDeclaredAwsLogGroup as jest.Mock).mockReturnValue({
        name: '/aws/lambda/test-function',
        arn,
      });

      const result = await getOneLogGroup(
        { by: { primary: { arn } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(DescribeLogGroupsCommand),
      );
      expect(result).not.toBeNull();
    });
  });

  given('a log group ref by ref (generic)', () => {
    then('we should route unique refs to lookup', async () => {
      const logGroupResponse = {
        logGroups: [
          {
            arn: 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/test-function',
            logGroupName: '/aws/lambda/test-function',
          },
        ],
      };

      mockSend.mockResolvedValue(logGroupResponse);
      (castModule.castIntoDeclaredAwsLogGroup as jest.Mock).mockReturnValue({
        name: '/aws/lambda/test-function',
        arn: logGroupResponse.logGroups?.[0]?.arn,
      });

      const result = await getOneLogGroup(
        { by: { ref: { name: '/aws/lambda/test-function' } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(DescribeLogGroupsCommand),
      );
      expect(result).not.toBeNull();
    });

    then('we should route primary refs to lookup', async () => {
      const arn =
        'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/test-function';
      const logGroupResponse = {
        logGroups: [
          {
            arn,
            logGroupName: '/aws/lambda/test-function',
          },
        ],
      };

      mockSend.mockResolvedValue(logGroupResponse);
      (castModule.castIntoDeclaredAwsLogGroup as jest.Mock).mockReturnValue({
        name: '/aws/lambda/test-function',
        arn,
      });

      const result = await getOneLogGroup({ by: { ref: { arn } } }, context);

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(DescribeLogGroupsCommand),
      );
      expect(result).not.toBeNull();
    });
  });

  given('a log group that does not exist', () => {
    then('we should return null for empty response', async () => {
      mockSend.mockResolvedValue({ logGroups: [] });

      const result = await getOneLogGroup(
        { by: { unique: { name: '/aws/lambda/nonexistent' } } },
        context,
      );

      expect(result).toBeNull();
    });

    then('we should return null for ResourceNotFoundException', async () => {
      const error = new Error('Log group not found');
      error.name = 'ResourceNotFoundException';
      mockSend.mockRejectedValue(error);

      const result = await getOneLogGroup(
        { by: { unique: { name: '/aws/lambda/nonexistent' } } },
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

      const result = await getOneLogGroup(
        { by: { unique: { name: '/aws/lambda/nonexistent' } } },
        context,
      );

      expect(result).toBeNull();
    });
  });
});
