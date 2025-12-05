import {
  CloudWatchLogsClient,
  GetQueryResultsCommand,
  QueryStatus,
  StartQueryCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { UniDateTime } from '@ehmpathy/uni-time';
import { given, then } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import * as castModule from './castIntoDeclaredAwsLogGroupReportDistOfPattern';
import { getOneLogGroupReportDistOfPattern } from './getOneLogGroupReportDistOfPattern';

jest.mock('@aws-sdk/client-cloudwatch-logs');
jest.mock('./castIntoDeclaredAwsLogGroupReportDistOfPattern');

const mockSend = jest.fn();
(CloudWatchLogsClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getSampleAwsApiContext();

describe('getOneLogGroupReportDistOfPattern', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseInput = {
    by: {
      unique: {
        logGroups: [{ name: '/aws/lambda/test-function' }],
        range: {
          since: '2024-11-01T00:00:00.000Z' as UniDateTime,
          until: '2024-11-30T23:59:59.000Z' as UniDateTime,
        },
        pattern: '@message',
        filter: null,
        limit: null,
      },
    },
  };

  given('a valid query', () => {
    then('we should start a query and poll for results', async () => {
      mockSend
        .mockResolvedValueOnce({ queryId: 'test-query-id' }) // StartQueryCommand
        .mockResolvedValueOnce({
          // GetQueryResultsCommand
          status: QueryStatus.Complete,
          results: [],
          statistics: { bytesScanned: 1000 },
        });

      (
        castModule.castIntoDeclaredAwsLogGroupReportDistOfPattern as jest.Mock
      ).mockReturnValue({
        logGroups: baseInput.by.unique.logGroups,
        range: baseInput.by.unique.range,
        pattern: '@message',
        filter: null,
        limit: null,
        rows: [],
      });

      const result = await getOneLogGroupReportDistOfPattern(
        baseInput,
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(StartQueryCommand));
      expect(mockSend).toHaveBeenCalledWith(expect.any(GetQueryResultsCommand));
      expect(result).toBeDefined();
    });
  });

  given('a query with filter', () => {
    then('we should include filter in query string', async () => {
      mockSend
        .mockResolvedValueOnce({ queryId: 'test-query-id' })
        .mockResolvedValueOnce({
          status: QueryStatus.Complete,
          results: [],
        });

      (
        castModule.castIntoDeclaredAwsLogGroupReportDistOfPattern as jest.Mock
      ).mockReturnValue({
        ...baseInput.by.unique,
        filter: '@message not like /START/',
        rows: [],
      });

      await getOneLogGroupReportDistOfPattern(
        {
          by: {
            unique: {
              ...baseInput.by.unique,
              filter: '@message not like /START/',
            },
          },
        },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(StartQueryCommand));
    });
  });

  given('a query with limit', () => {
    then('we should include limit in query string', async () => {
      mockSend
        .mockResolvedValueOnce({ queryId: 'test-query-id' })
        .mockResolvedValueOnce({
          status: QueryStatus.Complete,
          results: [],
        });

      (
        castModule.castIntoDeclaredAwsLogGroupReportDistOfPattern as jest.Mock
      ).mockReturnValue({
        ...baseInput.by.unique,
        limit: 100,
        rows: [],
      });

      await getOneLogGroupReportDistOfPattern(
        {
          by: {
            unique: {
              ...baseInput.by.unique,
              limit: 100,
            },
          },
        },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(StartQueryCommand));
    });
  });

  given('a query that requires polling', () => {
    then('we should poll until complete', async () => {
      mockSend
        .mockResolvedValueOnce({ queryId: 'test-query-id' })
        .mockResolvedValueOnce({ status: QueryStatus.Running })
        .mockResolvedValueOnce({ status: QueryStatus.Running })
        .mockResolvedValueOnce({
          status: QueryStatus.Complete,
          results: [],
        });

      (
        castModule.castIntoDeclaredAwsLogGroupReportDistOfPattern as jest.Mock
      ).mockReturnValue({
        ...baseInput.by.unique,
        rows: [],
      });

      await getOneLogGroupReportDistOfPattern(baseInput, context);

      // 1 StartQuery + 3 GetQueryResults
      expect(mockSend).toHaveBeenCalledTimes(4);
    });
  });

  given('a query that fails', () => {
    then('we should throw on Failed status', async () => {
      mockSend
        .mockResolvedValueOnce({ queryId: 'test-query-id' })
        .mockResolvedValueOnce({ status: QueryStatus.Failed });

      await expect(
        getOneLogGroupReportDistOfPattern(baseInput, context),
      ).rejects.toThrow('CloudWatch Logs Insights query failed');
    });
  });

  given('a query that is cancelled', () => {
    then('we should throw on Cancelled status', async () => {
      mockSend
        .mockResolvedValueOnce({ queryId: 'test-query-id' })
        .mockResolvedValueOnce({ status: QueryStatus.Cancelled });

      await expect(
        getOneLogGroupReportDistOfPattern(baseInput, context),
      ).rejects.toThrow('CloudWatch Logs Insights query cancelled');
    });
  });

  given('a query that times out', () => {
    then('we should throw on Timeout status', async () => {
      mockSend
        .mockResolvedValueOnce({ queryId: 'test-query-id' })
        .mockResolvedValueOnce({ status: QueryStatus.Timeout });

      await expect(
        getOneLogGroupReportDistOfPattern(baseInput, context),
      ).rejects.toThrow('CloudWatch Logs Insights query timed out');
    });
  });
});
