import { GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';
import { asIsoTimeStamp } from 'iso-time';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';
import * as clientModule from '@src/access/sdks/getAwsCostExplorerClient';

import * as castModule from './castIntoDeclaredAwsCostReportSpendObserved';
import { getOneCostReportSpendObserved } from './getOneCostReportSpendObserved';

// neutralize the on-disk cache wrapper so this unit test stays hermetic (no disk I/O);
// the cache is covered separately by castToCostReportCacheKey + getCostReportCache
jest.mock('with-simple-cache', () => ({
  withSimpleCacheAsync: (logic: unknown) => logic,
}));
jest.mock('@src/access/sdks/getAwsCostExplorerClient');
jest.mock('./castIntoDeclaredAwsCostReportSpendObserved');

const mockSend = jest.fn();
(clientModule.getAwsCostExplorerClient as jest.Mock).mockReturnValue({
  send: mockSend,
});

const context = getMockedAwsApiContext();

const baseInput = {
  by: {
    unique: {
      range: {
        since: asIsoTimeStamp('2026-07-01T00:00:00.000Z'),
        until: asIsoTimeStamp('2026-08-01T00:00:00.000Z'),
      },
      granularity: 'MONTHLY' as const,
      groupBy: { dimension: 'SERVICE' },
      filter: null,
      metric: 'UnblendedCost',
    },
  },
};

describe('getOneCostReportSpendObserved', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (
      castModule.castIntoDeclaredAwsCostReportSpendObserved as jest.Mock
    ).mockReturnValue({ marker: 'cast-output' });
  });

  given('[case1] a paged GetCostAndUsage response (two pages)', () => {
    then(
      'it pages via NextPageToken and casts the combined buckets',
      async () => {
        mockSend
          .mockResolvedValueOnce({
            ResultsByTime: [{ TimePeriod: { Start: 'a', End: 'b' } }],
            NextPageToken: 'page-2',
          })
          .mockResolvedValueOnce({
            ResultsByTime: [{ TimePeriod: { Start: 'b', End: 'c' } }],
            NextPageToken: undefined,
          });

        const result = await getOneCostReportSpendObserved(baseInput, context);

        // both pages fetched
        expect(mockSend).toHaveBeenCalledTimes(2);
        expect(mockSend).toHaveBeenCalledWith(
          expect.any(GetCostAndUsageCommand),
        );

        // the cast received BOTH pages' buckets, accumulated
        const castArg = (
          castModule.castIntoDeclaredAwsCostReportSpendObserved as jest.Mock
        ).mock.calls[0][0];
        expect(castArg.result.ResultsByTime).toHaveLength(2);

        // the composite returns the cast output
        expect(result).toEqual({ marker: 'cast-output' });
      },
    );
  });

  given('[case2] an invalid range (until before since)', () => {
    then('it fails loud BEFORE any billed request', async () => {
      const badInput = {
        by: {
          unique: {
            ...baseInput.by.unique,
            range: {
              since: asIsoTimeStamp('2026-08-01T00:00:00.000Z'),
              until: asIsoTimeStamp('2026-07-01T00:00:00.000Z'),
            },
          },
        },
      };

      await expect(
        getOneCostReportSpendObserved(badInput, context),
      ).rejects.toThrow();
      expect(mockSend).not.toHaveBeenCalled();
    });
  });
});
