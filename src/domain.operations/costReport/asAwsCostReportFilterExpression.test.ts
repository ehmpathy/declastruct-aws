import { given, then } from 'test-fns';

import { DeclaredAwsCostReportFilter } from '@src/domain.objects/DeclaredAwsCostReportFilter';

import { asAwsCostReportFilterExpression } from './asAwsCostReportFilterExpression';

describe('asAwsCostReportFilterExpression', () => {
  given('[case1] a null filter (whole-account scope)', () => {
    then('it maps to undefined (no Expression)', () => {
      expect(asAwsCostReportFilterExpression({ filter: null })).toEqual(
        undefined,
      );
    });
  });

  given('[case2] a set dimension filter', () => {
    const filter = DeclaredAwsCostReportFilter.as({
      dimension: 'SERVICE',
      values: ['Amazon Elastic Compute Cloud - Compute'],
    });

    then('it maps to a Dimensions Expression with Key + Values', () => {
      expect(asAwsCostReportFilterExpression({ filter })).toEqual({
        Dimensions: {
          Key: 'SERVICE',
          Values: ['Amazon Elastic Compute Cloud - Compute'],
        },
      });
    });
  });

  given('[case3] a filter with multiple values', () => {
    const filter = DeclaredAwsCostReportFilter.as({
      dimension: 'LINKED_ACCOUNT',
      values: ['111122223333', '444455556666'],
    });

    then('it carries all values through', () => {
      expect(asAwsCostReportFilterExpression({ filter })).toEqual({
        Dimensions: {
          Key: 'LINKED_ACCOUNT',
          Values: ['111122223333', '444455556666'],
        },
      });
    });
  });

  given('[case4] a filter with a dimension key AWS does not accept', () => {
    const filter = DeclaredAwsCostReportFilter.as({
      dimension: 'SERVIEC', // typo of SERVICE
      values: ['Amazon Elastic Compute Cloud - Compute'],
    });

    then(
      'it fails loud BEFORE the billed request, not silently through',
      () => {
        expect(() => asAwsCostReportFilterExpression({ filter })).toThrow(
          'cost report filter dimension is invalid',
        );
      },
    );
  });
});
