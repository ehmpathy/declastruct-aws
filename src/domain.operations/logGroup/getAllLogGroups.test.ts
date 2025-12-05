import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { given, then } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import * as castModule from './castIntoDeclaredAwsLogGroup';
import { getAllLogGroups } from './getAllLogGroups';

jest.mock('@aws-sdk/client-cloudwatch-logs', () => {
  const original = jest.requireActual('@aws-sdk/client-cloudwatch-logs');
  return {
    ...original,
    CloudWatchLogsClient: jest.fn(),
    paginateDescribeLogGroups: jest.fn(),
  };
});
jest.mock('./castIntoDeclaredAwsLogGroup');

const context = getSampleAwsApiContext();

describe('getAllLogGroups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('log groups exist', () => {
    then('we should return all log groups', async () => {
      const mockLogGroups = [
        {
          arn: 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/func-a',
          logGroupName: '/aws/lambda/func-a',
        },
        {
          arn: 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/func-b',
          logGroupName: '/aws/lambda/func-b',
        },
      ];

      // mock paginateDescribeLogGroups to return a single page
      const { paginateDescribeLogGroups } = jest.requireMock(
        '@aws-sdk/client-cloudwatch-logs',
      );
      paginateDescribeLogGroups.mockImplementation(async function* () {
        yield { logGroups: mockLogGroups };
      });

      (castModule.castIntoDeclaredAwsLogGroup as jest.Mock).mockImplementation(
        (lg) => ({
          name: lg.logGroupName,
          arn: lg.arn,
        }),
      );

      const result = await getAllLogGroups({}, context);

      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe('/aws/lambda/func-a');
      expect(result[1]?.name).toBe('/aws/lambda/func-b');
    });
  });

  given('a prefix filter is provided', () => {
    then('we should pass the prefix to the paginator', async () => {
      const mockLogGroups = [
        {
          arn: 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/func-a',
          logGroupName: '/aws/lambda/func-a',
        },
      ];

      const { paginateDescribeLogGroups } = jest.requireMock(
        '@aws-sdk/client-cloudwatch-logs',
      );
      paginateDescribeLogGroups.mockImplementation(async function* () {
        yield { logGroups: mockLogGroups };
      });

      (castModule.castIntoDeclaredAwsLogGroup as jest.Mock).mockImplementation(
        (lg) => ({
          name: lg.logGroupName,
          arn: lg.arn,
        }),
      );

      await getAllLogGroups({ by: { prefix: '/aws/lambda/' } }, context);

      expect(paginateDescribeLogGroups).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ logGroupNamePrefix: '/aws/lambda/' }),
      );
    });
  });

  given('multiple pages of results', () => {
    then('we should collect all pages', async () => {
      const page1 = [
        {
          arn: 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/func-a',
          logGroupName: '/aws/lambda/func-a',
        },
      ];
      const page2 = [
        {
          arn: 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/func-b',
          logGroupName: '/aws/lambda/func-b',
        },
      ];

      const { paginateDescribeLogGroups } = jest.requireMock(
        '@aws-sdk/client-cloudwatch-logs',
      );
      paginateDescribeLogGroups.mockImplementation(async function* () {
        yield { logGroups: page1 };
        yield { logGroups: page2 };
      });

      (castModule.castIntoDeclaredAwsLogGroup as jest.Mock).mockImplementation(
        (lg) => ({
          name: lg.logGroupName,
          arn: lg.arn,
        }),
      );

      const result = await getAllLogGroups({}, context);

      expect(result).toHaveLength(2);
    });
  });

  given('no log groups exist', () => {
    then('we should return empty array', async () => {
      const { paginateDescribeLogGroups } = jest.requireMock(
        '@aws-sdk/client-cloudwatch-logs',
      );
      paginateDescribeLogGroups.mockImplementation(async function* () {
        yield { logGroups: [] };
      });

      const result = await getAllLogGroups({}, context);

      expect(result).toHaveLength(0);
    });
  });
});
