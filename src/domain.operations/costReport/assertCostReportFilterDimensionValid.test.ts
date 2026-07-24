import { given, then } from 'test-fns';

import { assertCostReportFilterDimensionValid } from './assertCostReportFilterDimensionValid';

describe('assertCostReportFilterDimensionValid', () => {
  given('[case1] a dimension AWS accepts', () => {
    then('it passes (no throw) for SERVICE', () => {
      expect(() =>
        assertCostReportFilterDimensionValid({ dimension: 'SERVICE' }),
      ).not.toThrow();
    });

    then('it passes (no throw) for LINKED_ACCOUNT', () => {
      expect(() =>
        assertCostReportFilterDimensionValid({ dimension: 'LINKED_ACCOUNT' }),
      ).not.toThrow();
    });
  });

  given('[case2] a dimension AWS does not accept', () => {
    then('it fails loud for a typo', () => {
      expect(() =>
        assertCostReportFilterDimensionValid({ dimension: 'SERVIEC' }),
      ).toThrow('cost report filter dimension is invalid');
    });

    then('it fails loud for an empty string', () => {
      expect(() =>
        assertCostReportFilterDimensionValid({ dimension: '' }),
      ).toThrow('cost report filter dimension is invalid');
    });
  });
});
