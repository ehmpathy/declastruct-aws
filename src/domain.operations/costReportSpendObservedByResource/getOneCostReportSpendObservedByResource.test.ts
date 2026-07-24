import { GetCostAndUsageWithResourcesCommand } from '@aws-sdk/client-cost-explorer';
import { asIsoTimeStamp } from 'iso-time';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';
import * as clientModule from '@src/access/sdks/getAwsCostExplorerClient';

import { getOneCostReportSpendObservedByResource } from './getOneCostReportSpendObservedByResource';

// neutralize the on-disk cache wrapper so this unit test stays hermetic (no disk I/O)
jest.mock('with-simple-cache', () => ({
  withSimpleCacheAsync: (logic: unknown) => logic,
}));
jest.mock('@src/access/sdks/getAwsCostExplorerClient');

const mockSend = jest.fn();
(clientModule.getAwsCostExplorerClient as jest.Mock).mockReturnValue({
  send: mockSend,
});

const context = getMockedAwsApiContext();

// a range within the ~14-day retention window (relative to now) so the guard passes
const asRecentRange = () => {
  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const until = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
  return {
    since: asIsoTimeStamp(since.toISOString()),
    until: asIsoTimeStamp(until.toISOString()),
  };
};

const baseInput = {
  by: {
    unique: {
      range: asRecentRange(),
      granularity: 'DAILY' as const,
      filter: {
        dimension: 'SERVICE',
        values: ['Amazon Elastic Compute Cloud - Compute'],
      },
      metric: 'UnblendedCost',
    },
  },
};

describe('getOneCostReportSpendObservedByResource', () => {
  beforeEach(() => jest.clearAllMocks());

  given('[case1] a paged per-resource response (two pages)', () => {
    then(
      'it pages via NextPageToken and casts the accumulated buckets',
      async () => {
        mockSend
          .mockResolvedValueOnce({
            ResultsByTime: [
              {
                TimePeriod: { Start: '2026-07-10', End: '2026-07-11' },
                Groups: [
                  {
                    Keys: ['i-0aaa'],
                    Metrics: { UnblendedCost: { Amount: '0.50', Unit: 'USD' } },
                  },
                ],
              },
            ],
            NextPageToken: 'page-2',
          })
          .mockResolvedValueOnce({
            ResultsByTime: [
              {
                TimePeriod: { Start: '2026-07-11', End: '2026-07-12' },
                Groups: [
                  {
                    Keys: ['i-0aaa'],
                    Metrics: { UnblendedCost: { Amount: '0.60', Unit: 'USD' } },
                  },
                ],
              },
            ],
            NextPageToken: undefined,
          });

        const result = await getOneCostReportSpendObservedByResource(
          baseInput,
          context,
        );

        expect(mockSend).toHaveBeenCalledTimes(2);
        expect(mockSend).toHaveBeenCalledWith(
          expect.any(GetCostAndUsageWithResourcesCommand),
        );
        expect(result.buckets).toHaveLength(2);
        expect(result.total?.amount).toBe('1.10');
      },
    );
  });

  given('[case2] the read hits the resource-level opt-in-off signal', () => {
    // the paid opt-in is off. a report reads at PLAN time, so a throw would abort the whole
    // plan (blast radius). it must DEGRADE to an empty report + log loud that points at the
    // declared precondition — the fail-loud lives on the preference's set (the apply path)
    then(
      'it degrades to an empty report and logs loud (never throws)',
      async () => {
        const err = new Error(
          "Resource-level data granularity is an opt-in only feature. You can be enable this feature from the PAYER account's Cost Explorer Settings page.",
        );
        err.name = 'AccessDeniedException';
        mockSend.mockRejectedValueOnce(err);

        const warnSpy = jest.fn();
        const contextSpy = {
          ...context,
          log: { ...context.log, warn: warnSpy },
        };

        const result = await getOneCostReportSpendObservedByResource(
          baseInput,
          contextSpy,
        );

        // no throw — it returned an empty report
        expect(result.buckets).toEqual([]);
        // and logged loud with a pointer to the declared precondition
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toContain(
          'DeclaredAwsCostExplorerPreference',
        );
      },
    );
  });

  given('[case3] a range older than the ~14-day retention window', () => {
    then('it fails loud BEFORE any billed request', async () => {
      const staleInput = {
        by: {
          unique: {
            ...baseInput.by.unique,
            range: {
              since: asIsoTimeStamp('2020-01-01T00:00:00.000Z'),
              until: asIsoTimeStamp('2020-01-10T00:00:00.000Z'),
            },
          },
        },
      };

      await expect(
        getOneCostReportSpendObservedByResource(staleInput, context),
      ).rejects.toThrow();
      expect(mockSend).not.toHaveBeenCalled();
    });
  });
});
