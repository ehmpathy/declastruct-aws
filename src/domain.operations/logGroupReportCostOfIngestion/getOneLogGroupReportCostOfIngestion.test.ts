import {
  CloudWatchClient,
  GetMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';
import type { UniDateTime } from '@ehmpathy/uni-time';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';
import * as getAllLogGroupsModule from '@src/domain.operations/logGroup/getAllLogGroups';
import * as getOneLogGroupModule from '@src/domain.operations/logGroup/getOneLogGroup';

import * as castModule from './castIntoDeclaredAwsLogGroupReportCostOfIngestion';
import { getOneLogGroupReportCostOfIngestion } from './getOneLogGroupReportCostOfIngestion';

jest.mock('@aws-sdk/client-cloudwatch');
jest.mock('../logGroup/getAllLogGroups');
jest.mock('../logGroup/getOneLogGroup');
jest.mock('./castIntoDeclaredAwsLogGroupReportCostOfIngestion');

const mockSend = jest.fn();
(CloudWatchClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

describe('getOneLogGroupReportCostOfIngestion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseInput = {
    by: {
      unique: {
        logGroupFilter: { prefix: '/aws/lambda/' },
        range: {
          since: '2024-11-01T00:00:00.000Z' as UniDateTime,
          until: '2024-11-30T23:59:59.000Z' as UniDateTime,
        },
      },
    },
  };

  given('a prefix filter', () => {
    then('we should resolve log groups and fetch metrics', async () => {
      (getAllLogGroupsModule.getAllLogGroups as jest.Mock).mockResolvedValue([
        { name: '/aws/lambda/func-a' },
        { name: '/aws/lambda/func-b' },
      ]);

      mockSend.mockResolvedValue({
        MetricDataResults: [
          { Id: 'bytes_0', Values: [1000] },
          { Id: 'events_0', Values: [10] },
          { Id: 'bytes_1', Values: [2000] },
          { Id: 'events_1', Values: [20] },
        ],
      });

      (
        castModule.castIntoDeclaredAwsLogGroupReportCostOfIngestion as jest.Mock
      ).mockReturnValue({
        logGroupFilter: baseInput.by.unique.logGroupFilter,
        range: baseInput.by.unique.range,
        totalIngestedBytes: 3000,
        totalLogEvents: 30,
        rows: [],
      });

      const result = await getOneLogGroupReportCostOfIngestion(
        baseInput,
        context,
      );

      expect(getAllLogGroupsModule.getAllLogGroups).toHaveBeenCalledWith(
        { by: { prefix: '/aws/lambda/' } },
        expect.objectContaining({
          aws: context.aws,
        }),
      );
      expect(mockSend).toHaveBeenCalledWith(expect.any(GetMetricDataCommand));
      expect(result).toBeDefined();
    });
  });

  given('a names filter', () => {
    then('we should verify each log group exists', async () => {
      (getOneLogGroupModule.getOneLogGroup as jest.Mock)
        .mockResolvedValueOnce({ name: '/aws/lambda/func-a' })
        .mockResolvedValueOnce({ name: '/aws/lambda/func-b' });

      mockSend.mockResolvedValue({
        MetricDataResults: [],
      });

      (
        castModule.castIntoDeclaredAwsLogGroupReportCostOfIngestion as jest.Mock
      ).mockReturnValue({
        logGroupFilter: { names: ['/aws/lambda/func-a', '/aws/lambda/func-b'] },
        range: baseInput.by.unique.range,
        rows: [],
      });

      await getOneLogGroupReportCostOfIngestion(
        {
          by: {
            unique: {
              logGroupFilter: {
                names: ['/aws/lambda/func-a', '/aws/lambda/func-b'],
              },
              range: baseInput.by.unique.range,
            },
          },
        },
        context,
      );

      expect(getOneLogGroupModule.getOneLogGroup).toHaveBeenCalledTimes(2);
    });
  });

  given('a names filter with non-existent log groups', () => {
    then('we should filter out null results', async () => {
      (getOneLogGroupModule.getOneLogGroup as jest.Mock)
        .mockResolvedValueOnce({ name: '/aws/lambda/exists' })
        .mockResolvedValueOnce(null); // doesn't exist

      mockSend.mockResolvedValue({
        MetricDataResults: [],
      });

      (
        castModule.castIntoDeclaredAwsLogGroupReportCostOfIngestion as jest.Mock
      ).mockImplementation((input) => ({
        logGroupFilter: input.unique.logGroupFilter,
        range: input.unique.range,
        rows: [],
      }));

      await getOneLogGroupReportCostOfIngestion(
        {
          by: {
            unique: {
              logGroupFilter: {
                names: ['/aws/lambda/exists', '/aws/lambda/not-exists'],
              },
              range: baseInput.by.unique.range,
            },
          },
        },
        context,
      );

      // should only pass the existing log group to cast
      expect(
        castModule.castIntoDeclaredAwsLogGroupReportCostOfIngestion,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          logGroupNames: ['/aws/lambda/exists'],
        }),
      );
    });
  });

  given('no log groups found', () => {
    then('we should return empty report', async () => {
      (getAllLogGroupsModule.getAllLogGroups as jest.Mock).mockResolvedValue(
        [],
      );

      (
        castModule.castIntoDeclaredAwsLogGroupReportCostOfIngestion as jest.Mock
      ).mockReturnValue({
        logGroupFilter: baseInput.by.unique.logGroupFilter,
        range: baseInput.by.unique.range,
        totalIngestedBytes: 0,
        totalLogEvents: 0,
        rows: [],
      });

      const result = await getOneLogGroupReportCostOfIngestion(
        baseInput,
        context,
      );

      // should not call CloudWatch if no log groups
      expect(mockSend).not.toHaveBeenCalled();
      expect(result.totalIngestedBytes).toBe(0);
    });
  });

  given('many log groups', () => {
    then('we should batch metric queries', async () => {
      // create 300 log groups (would need 600 metrics = 2 batches at 500 max)
      const manyLogGroups = Array.from({ length: 300 }, (_, i) => ({
        name: `/aws/lambda/func-${i}`,
      }));

      (getAllLogGroupsModule.getAllLogGroups as jest.Mock).mockResolvedValue(
        manyLogGroups,
      );

      mockSend.mockResolvedValue({
        MetricDataResults: [],
      });

      (
        castModule.castIntoDeclaredAwsLogGroupReportCostOfIngestion as jest.Mock
      ).mockReturnValue({
        logGroupFilter: baseInput.by.unique.logGroupFilter,
        range: baseInput.by.unique.range,
        rows: [],
      });

      await getOneLogGroupReportCostOfIngestion(baseInput, context);

      // 600 metrics / 500 per batch = 2 batches
      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });
});
