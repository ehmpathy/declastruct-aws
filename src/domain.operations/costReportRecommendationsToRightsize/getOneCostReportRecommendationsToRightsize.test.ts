import { GetRightsizingRecommendationCommand } from '@aws-sdk/client-cost-explorer';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';
import * as clientModule from '@src/access/sdks/getAwsCostExplorerClient';

import * as castModule from './castIntoDeclaredAwsCostReportRecommendationsToRightsize';
import { getOneCostReportRecommendationsToRightsize } from './getOneCostReportRecommendationsToRightsize';

// neutralize the on-disk cache wrapper so this unit test stays hermetic (no disk I/O)
jest.mock('with-simple-cache', () => ({
  withSimpleCacheAsync: (logic: unknown) => logic,
}));
jest.mock('@src/access/sdks/getAwsCostExplorerClient');
jest.mock('./castIntoDeclaredAwsCostReportRecommendationsToRightsize');

const mockSend = jest.fn();
(clientModule.getAwsCostExplorerClient as jest.Mock).mockReturnValue({
  send: mockSend,
});

const context = getMockedAwsApiContext();

const baseInput = {
  by: {
    unique: {
      service: 'AmazonEC2',
      recommendationTarget: 'SAME_INSTANCE_FAMILY',
      benefitsConsidered: true,
      filter: null,
    },
  },
};

describe('getOneCostReportRecommendationsToRightsize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (
      castModule.castIntoDeclaredAwsCostReportRecommendationsToRightsize as jest.Mock
    ).mockReturnValue({ marker: 'cast-output' });
  });

  given('[case1] a paged recommendation response (two pages)', () => {
    then(
      'it pages via NextPageToken and casts the accumulated recs',
      async () => {
        mockSend
          .mockResolvedValueOnce({
            Summary: { TotalRecommendationCount: '2' },
            RightsizingRecommendations: [{ RightsizingType: 'TERMINATE' }],
            NextPageToken: 'page-2',
          })
          .mockResolvedValueOnce({
            RightsizingRecommendations: [{ RightsizingType: 'MODIFY' }],
            NextPageToken: undefined,
          });

        const result = await getOneCostReportRecommendationsToRightsize(
          baseInput,
          context,
        );

        expect(mockSend).toHaveBeenCalledTimes(2);
        expect(mockSend).toHaveBeenCalledWith(
          expect.any(GetRightsizingRecommendationCommand),
        );

        // the cast received BOTH pages' recs, and the FIRST page's summary
        const castArg = (
          castModule.castIntoDeclaredAwsCostReportRecommendationsToRightsize as jest.Mock
        ).mock.calls[0][0];
        expect(castArg.result.RightsizingRecommendations).toHaveLength(2);
        expect(castArg.result.Summary).toEqual({
          TotalRecommendationCount: '2',
        });

        expect(result).toEqual({ marker: 'cast-output' });
      },
    );
  });

  given('[case2] an unsupported service', () => {
    then('it fails loud BEFORE any billed request', async () => {
      const badInput = {
        by: { unique: { ...baseInput.by.unique, service: 'AmazonRDS' } },
      };

      await expect(
        getOneCostReportRecommendationsToRightsize(badInput, context),
      ).rejects.toThrow();
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  given('[case4] the read hits the opt-in-disabled signal', () => {
    // the console-only opt-in is off. a report reads at PLAN time, so a throw would abort
    // the whole plan (blast radius). it must DEGRADE to an empty report + log loud that
    // points at the declared precondition — the fail-loud lives on the preference's set
    then(
      'it degrades to an empty report and logs loud (never throws)',
      async () => {
        const err = new Error(
          'This is an opt-in only feature. Enable it from the Cost Explorer Preferences page.',
        );
        err.name = 'AccessDeniedException';
        mockSend.mockRejectedValueOnce(err);
        (
          castModule.castIntoDeclaredAwsCostReportRecommendationsToRightsize as jest.Mock
        ).mockReturnValue({ recommendations: [], summary: undefined });

        const warnSpy = jest.fn();
        const contextSpy = {
          ...context,
          log: { ...context.log, warn: warnSpy },
        };

        const result = await getOneCostReportRecommendationsToRightsize(
          baseInput,
          contextSpy,
        );

        // no throw — it returned the empty report the cast produced
        expect(result.recommendations).toEqual([]);
        // and logged loud with a pointer to the declared precondition
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toContain(
          'DeclaredAwsCostExplorerPreference',
        );
      },
    );
  });

  given(
    '[case3] a rec whose savings degraded to null (anomalous AWS shape)',
    () => {
      // the r11-i015 blast-radius fix: an unreadable savings must NOT abort the shared
      // plan. the cast degrades it to null; the composite must log loud + return, NOT throw
      then('it logs loud per null-savings rec and never throws', async () => {
        mockSend.mockResolvedValueOnce({
          RightsizingRecommendations: [{ RightsizingType: 'MODIFY' }],
          NextPageToken: undefined,
        });
        (
          castModule.castIntoDeclaredAwsCostReportRecommendationsToRightsize as jest.Mock
        ).mockReturnValue({
          recommendations: [
            {
              resourceId: 'i-anomalous',
              action: 'MODIFY',
              estimatedMonthlySavings: null,
            },
          ],
        });

        const warnSpy = jest.fn();
        const contextSpy = {
          ...context,
          log: { ...context.log, warn: warnSpy },
        };

        const result = await getOneCostReportRecommendationsToRightsize(
          baseInput,
          contextSpy,
        );

        // it returned the report (no throw that would abort the shared plan)
        expect(result.recommendations?.[0]?.estimatedMonthlySavings).toBeNull();
        // and it logged loud about the null-savings rec (observable, not swallowed)
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('unreadable savings shape'),
          expect.objectContaining({ resourceId: 'i-anomalous' }),
        );
      });
    },
  );
});
