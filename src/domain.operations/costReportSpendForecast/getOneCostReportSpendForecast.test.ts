import { GetCostForecastCommand } from '@aws-sdk/client-cost-explorer';
import { asIsoTimeStamp } from 'iso-time';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';
import * as clientModule from '@src/access/sdks/getAwsCostExplorerClient';

import * as castModule from './castIntoDeclaredAwsCostReportSpendForecast';
import { getOneCostReportSpendForecast } from './getOneCostReportSpendForecast';

// neutralize the on-disk cache wrapper so this unit test stays hermetic (no disk I/O)
jest.mock('with-simple-cache', () => ({
  withSimpleCacheAsync: (logic: unknown) => logic,
}));
jest.mock('@src/access/sdks/getAwsCostExplorerClient');
jest.mock('./castIntoDeclaredAwsCostReportSpendForecast');

const mockSend = jest.fn();
(clientModule.getAwsCostExplorerClient as jest.Mock).mockReturnValue({
  send: mockSend,
});

const context = getMockedAwsApiContext();

// a future window (start >= today), MONTHLY within the 18mo horizon
const baseInput = {
  by: {
    unique: {
      range: {
        since: asIsoTimeStamp('2027-01-01T00:00:00.000Z'),
        until: asIsoTimeStamp('2027-02-01T00:00:00.000Z'),
      },
      granularity: 'MONTHLY' as const,
      metric: 'UnblendedCost',
      filter: null,
      predictionInterval: 80,
    },
  },
};

describe('getOneCostReportSpendForecast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (
      castModule.castIntoDeclaredAwsCostReportSpendForecast as jest.Mock
    ).mockReturnValue({ marker: 'cast-output' });
  });

  given('[case1] a normal forecast response', () => {
    then('it sends GetCostForecast and casts the result', async () => {
      mockSend.mockResolvedValue({
        Total: { Amount: '18.90', Unit: 'USD' },
        ForecastResultsByTime: [{ MeanValue: '18.90' }],
      });

      const result = await getOneCostReportSpendForecast(baseInput, context);

      expect(mockSend).toHaveBeenCalledWith(expect.any(GetCostForecastCommand));
      expect(result).toEqual({ marker: 'cast-output' });
    });
  });

  given('[case2] AWS throws DataUnavailableException (young account)', () => {
    then('it degrades to an empty forecast, not a throw', async () => {
      const awsError = new Error('too little history');
      awsError.name = 'DataUnavailableException';
      mockSend.mockRejectedValue(awsError);

      // does NOT throw — degrades
      const result = await getOneCostReportSpendForecast(baseInput, context);
      expect(result).toEqual({ marker: 'cast-output' });

      // the cast received the EMPTY forecast shape (no points), not the error
      const castArg = (
        castModule.castIntoDeclaredAwsCostReportSpendForecast as jest.Mock
      ).mock.calls[0][0];
      expect(castArg.result.ForecastResultsByTime).toEqual([]);
      expect(castArg.result.Total).toBeUndefined();
    });
  });

  given('[case3] AWS throws an unrelated error', () => {
    then('it fails LOUD (rethrows), never degrades', async () => {
      const awsError = new Error('access denied');
      awsError.name = 'AccessDeniedException';
      mockSend.mockRejectedValue(awsError);

      await expect(
        getOneCostReportSpendForecast(baseInput, context),
      ).rejects.toThrow();
      // the empty-degrade cast was NOT taken
      expect(
        castModule.castIntoDeclaredAwsCostReportSpendForecast,
      ).not.toHaveBeenCalled();
    });
  });
});
