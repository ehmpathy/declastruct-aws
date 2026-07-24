import { BadRequestError } from 'helpful-errors';
import { given, then } from 'test-fns';

import { assertPredictionIntervalValid } from './assertPredictionIntervalValid';

describe('assertPredictionIntervalValid', () => {
  given('[case1] an interval inside the 51-99 band', () => {
    then('it passes without a throw', () => {
      expect(() =>
        assertPredictionIntervalValid({ predictionInterval: 80 }),
      ).not.toThrow();
    });
  });

  given('[case2] an interval at each inclusive boundary', () => {
    then('51 passes', () => {
      expect(() =>
        assertPredictionIntervalValid({ predictionInterval: 51 }),
      ).not.toThrow();
    });

    then('99 passes', () => {
      expect(() =>
        assertPredictionIntervalValid({ predictionInterval: 99 }),
      ).not.toThrow();
    });
  });

  given('[case3] an interval below the band', () => {
    then('it fails loud with a BadRequestError', () => {
      expect(() =>
        assertPredictionIntervalValid({ predictionInterval: 50 }),
      ).toThrow(BadRequestError);
    });

    then('the user-directed fail-loud message matches the snapshot', () => {
      expect(() =>
        assertPredictionIntervalValid({ predictionInterval: 50 }),
      ).toThrowErrorMatchingSnapshot();
    });
  });

  given('[case4] an interval above the band', () => {
    then('it fails loud with a BadRequestError', () => {
      expect(() =>
        assertPredictionIntervalValid({ predictionInterval: 100 }),
      ).toThrow(BadRequestError);
    });

    then('the user-directed fail-loud message matches the snapshot', () => {
      expect(() =>
        assertPredictionIntervalValid({ predictionInterval: 100 }),
      ).toThrowErrorMatchingSnapshot();
    });
  });
});
