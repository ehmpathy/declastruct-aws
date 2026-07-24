import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';
import * as clientModule from '@src/access/sdks/getAwsCostExplorerClient';

import { getOneCostExplorerPreference } from './getOneCostExplorerPreference';

jest.mock('@src/access/sdks/getAwsCostExplorerClient');

const mockSend = jest.fn();
(clientModule.getAwsCostExplorerClient as jest.Mock).mockReturnValue({
  send: mockSend,
});

const context = getMockedAwsApiContext();

const input = {
  by: { unique: { feature: 'rightsizeRecommendations' } },
};

describe('getOneCostExplorerPreference', () => {
  beforeEach(() => jest.clearAllMocks());

  given('[case1] the probe read succeeds (opt-in enabled)', () => {
    then('it returns the present precondition object', async () => {
      mockSend.mockResolvedValueOnce({ RightsizingRecommendations: [] });

      const result = await getOneCostExplorerPreference(input, context);

      expect(result).not.toBeNull();
      expect(result?.feature).toEqual('rightsizeRecommendations');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  given('[case2] the probe throws the opt-in-disabled signal', () => {
    then('it returns null (absent → off)', async () => {
      const err = new Error(
        'This is an opt-in only feature. Enable it from the Cost Explorer Preferences page.',
      );
      err.name = 'AccessDeniedException';
      mockSend.mockRejectedValueOnce(err);

      const result = await getOneCostExplorerPreference(input, context);

      expect(result).toBeNull();
    });
  });

  given(
    '[case3] the probe throws DataUnavailable (enabled, no data yet)',
    () => {
      then('it logs loud and returns the present object', async () => {
        const err = new Error('no data');
        err.name = 'DataUnavailableException';
        mockSend.mockRejectedValueOnce(err);

        const warnSpy = jest.fn();
        const contextSpy = {
          ...context,
          log: { ...context.log, warn: warnSpy },
        };

        const result = await getOneCostExplorerPreference(input, contextSpy);

        expect(result).not.toBeNull();
        expect(result?.feature).toEqual('rightsizeRecommendations');
        expect(warnSpy).toHaveBeenCalledTimes(1);
      });
    },
  );

  given('[case4] the probe throws a real iam denial', () => {
    then('it rethrows (NOT masked as off)', async () => {
      const err = new Error(
        'is not authorized to perform: ce:GetRightsizeRecommendation',
      );
      err.name = 'AccessDeniedException';
      mockSend.mockRejectedValueOnce(err);

      await expect(
        getOneCostExplorerPreference(input, context),
      ).rejects.toThrow();
    });
  });

  given('[case5] an unsupported feature name', () => {
    then('it fails loud BEFORE any billed probe', async () => {
      const badInput = { by: { unique: { feature: 'notModeledFeature' } } };

      await expect(
        getOneCostExplorerPreference(badInput, context),
      ).rejects.toThrow();
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  given('[case6] the resourceLevelData probe succeeds (opt-in enabled)', () => {
    const resourceInput = {
      by: { unique: { feature: 'resourceLevelData' } },
    };
    then('it returns the present precondition object', async () => {
      mockSend.mockResolvedValueOnce({ ResultsByTime: [] });

      const result = await getOneCostExplorerPreference(resourceInput, context);

      expect(result).not.toBeNull();
      expect(result?.feature).toEqual('resourceLevelData');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  given(
    '[case7] the resourceLevelData probe throws the opt-in-off AccessDenied',
    () => {
      // the off-signal is an AccessDeniedException whose message names the resource-level
      // opt-in (same message-signal shape as the rightsize probe, NOT a DataUnavailable name)
      const resourceInput = {
        by: { unique: { feature: 'resourceLevelData' } },
      };
      then('it returns null (absent → off)', async () => {
        const err = new Error(
          "Resource-level data granularity is an opt-in only feature. You can be enable this feature from the PAYER account's Cost Explorer Settings page.",
        );
        err.name = 'AccessDeniedException';
        mockSend.mockRejectedValueOnce(err);

        const result = await getOneCostExplorerPreference(
          resourceInput,
          context,
        );

        expect(result).toBeNull();
      });
    },
  );
});
