import type { RightsizingRecommendation } from '@aws-sdk/client-cost-explorer';
import { given, then } from 'test-fns';

import { asRightsizeSavingsAmount } from './asRightsizeSavingsAmount';

describe('asRightsizeSavingsAmount', () => {
  given('[case1] a TERMINATE rec with a savings amount', () => {
    const rec: RightsizingRecommendation = {
      RightsizingType: 'TERMINATE',
      TerminateRecommendationDetail: { EstimatedMonthlySavings: '20.00' },
    };

    then('it returns the terminate savings amount', () => {
      expect(asRightsizeSavingsAmount({ rec })).toEqual('20.00');
    });
  });

  given('[case2] a MODIFY rec with a default target', () => {
    const rec: RightsizingRecommendation = {
      RightsizingType: 'MODIFY',
      ModifyRecommendationDetail: {
        TargetInstances: [
          { DefaultTargetInstance: false, EstimatedMonthlySavings: '1.00' },
          { DefaultTargetInstance: true, EstimatedMonthlySavings: '8.10' },
        ],
      },
    };

    then('it returns the default target savings amount', () => {
      expect(asRightsizeSavingsAmount({ rec })).toEqual('8.10');
    });
  });

  given('[case3] a MODIFY rec with target instances but none default', () => {
    const rec: RightsizingRecommendation = {
      RightsizingType: 'MODIFY',
      ModifyRecommendationDetail: {
        TargetInstances: [
          { DefaultTargetInstance: false, EstimatedMonthlySavings: '1.00' },
        ],
      },
    };

    then(
      'it degrades to null (unknown), not a silent zero, not a throw',
      () => {
        // null is the sentinel for an unreadable anomaly — NEVER a false '0' (mask) and
        // NEVER a throw (which would abort the whole shared declastruct plan)
        expect(asRightsizeSavingsAmount({ rec })).toBeNull();
      },
    );
  });

  given('[case4] a MODIFY rec with no target instances', () => {
    const rec: RightsizingRecommendation = {
      RightsizingType: 'MODIFY',
      ModifyRecommendationDetail: { TargetInstances: [] },
    };

    then(
      'it degrades to null (unknown), not a silent zero, not a throw',
      () => {
        expect(asRightsizeSavingsAmount({ rec })).toBeNull();
      },
    );
  });

  given('[case5] a TERMINATE rec with no savings detail', () => {
    const rec: RightsizingRecommendation = { RightsizingType: 'TERMINATE' };

    then(
      'it degrades to null (unknown), not a silent zero, not a throw',
      () => {
        expect(asRightsizeSavingsAmount({ rec })).toBeNull();
      },
    );
  });

  given(
    '[case6] a MODIFY rec whose default target lacks a savings amount',
    () => {
      const rec: RightsizingRecommendation = {
        RightsizingType: 'MODIFY',
        ModifyRecommendationDetail: {
          TargetInstances: [{ DefaultTargetInstance: true }],
        },
      };

      then(
        'it degrades to null (unknown), not a silent zero, not a throw',
        () => {
          expect(asRightsizeSavingsAmount({ rec })).toBeNull();
        },
      );
    },
  );
});
