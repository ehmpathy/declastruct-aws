import {
  GetSavingsPlansPurchaseRecommendationCommand,
  StartSavingsPlansPurchaseRecommendationGenerationCommand,
} from '@aws-sdk/client-cost-explorer';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';
import * as clientModule from '@src/access/sdks/getAwsCostExplorerClient';

import * as castModule from './castIntoDeclaredAwsCostReportRecommendationsToPurchasePlan';
import { getOneCostReportRecommendationsToPurchasePlan } from './getOneCostReportRecommendationsToPurchasePlan';

// neutralize the on-disk cache wrapper so this unit test stays hermetic (no disk I/O)
jest.mock('with-simple-cache', () => ({
  withSimpleCacheAsync: (logic: unknown) => logic,
}));
jest.mock('@src/access/sdks/getAwsCostExplorerClient');
jest.mock('./castIntoDeclaredAwsCostReportRecommendationsToPurchasePlan');

const mockSend = jest.fn();
(clientModule.getAwsCostExplorerClient as jest.Mock).mockReturnValue({
  send: mockSend,
});

const context = getMockedAwsApiContext();

const baseInput = {
  by: {
    unique: {
      savingsPlansType: 'COMPUTE_SP',
      termInYears: 'ONE_YEAR',
      paymentOption: 'NO_UPFRONT',
      lookbackDays: 'THIRTY_DAYS',
      accountScope: 'LINKED',
      filter: null,
    },
  },
};

const getResponse = {
  SavingsPlansPurchaseRecommendation: {
    SavingsPlansPurchaseRecommendationDetails: [{ marker: 'detail' }],
  },
  NextPageToken: undefined,
};

describe('getOneCostReportRecommendationsToPurchasePlan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (
      castModule.castIntoDeclaredAwsCostReportRecommendationsToPurchasePlan as jest.Mock
    ).mockReturnValue({ marker: 'cast-output' });
  });

  given('[case1] Start succeeds, then Get returns a recommendation set', () => {
    then('it fires Start* then reads the current set, and casts', async () => {
      mockSend
        .mockResolvedValueOnce({}) // Start* generation
        .mockResolvedValueOnce(getResponse); // Get read

      const result = await getOneCostReportRecommendationsToPurchasePlan(
        baseInput,
        context,
      );

      expect(mockSend).toHaveBeenNthCalledWith(
        1,
        expect.any(StartSavingsPlansPurchaseRecommendationGenerationCommand),
      );
      expect(mockSend).toHaveBeenNthCalledWith(
        2,
        expect.any(GetSavingsPlansPurchaseRecommendationCommand),
      );
      expect(result).toEqual({ marker: 'cast-output' });
    });
  });

  given(
    '[case2] Start* throws GenerationExistsException (already in flight)',
    () => {
      then(
        'it tolerates the Start failure and still reads the current set',
        async () => {
          const genError = new Error('generation already in flight');
          genError.name = 'GenerationExistsException';
          mockSend
            .mockRejectedValueOnce(genError) // Start* tolerated
            .mockResolvedValueOnce(getResponse); // Get still runs

          const result = await getOneCostReportRecommendationsToPurchasePlan(
            baseInput,
            context,
          );

          // Get ran despite the tolerated Start failure — no throw
          expect(mockSend).toHaveBeenNthCalledWith(
            2,
            expect.any(GetSavingsPlansPurchaseRecommendationCommand),
          );
          expect(result).toEqual({ marker: 'cast-output' });
        },
      );
    },
  );

  given('[case3] Start* throws an unrelated error', () => {
    then('it fails LOUD (rethrows), never proceeds to the read', async () => {
      const awsError = new Error('access denied');
      awsError.name = 'AccessDeniedException';
      mockSend.mockRejectedValueOnce(awsError); // Start* not tolerated

      await expect(
        getOneCostReportRecommendationsToPurchasePlan(baseInput, context),
      ).rejects.toThrow();
      // never reached the Get read
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });
});
