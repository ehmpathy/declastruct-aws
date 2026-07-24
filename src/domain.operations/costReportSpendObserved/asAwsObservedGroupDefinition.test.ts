import { given, then } from 'test-fns';

import { asAwsObservedGroupDefinition } from './asAwsObservedGroupDefinition';

describe('asAwsObservedGroupDefinition', () => {
  given('[case1] a dimension groupBy', () => {
    then('it maps to an AWS DIMENSION GroupDefinition', () => {
      expect(
        asAwsObservedGroupDefinition({ groupBy: { dimension: 'SERVICE' } }),
      ).toEqual({ Type: 'DIMENSION', Key: 'SERVICE' });
    });
  });

  given('[case2] a tag groupBy (vision usecase #3)', () => {
    then('it maps to an AWS TAG GroupDefinition', () => {
      expect(asAwsObservedGroupDefinition({ groupBy: { tag: 'env' } })).toEqual(
        { Type: 'TAG', Key: 'env' },
      );
    });
  });
});
