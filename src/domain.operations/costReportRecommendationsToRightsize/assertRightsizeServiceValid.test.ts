import { BadRequestError } from 'helpful-errors';
import { given, then } from 'test-fns';

import { assertRightsizeServiceValid } from './assertRightsizeServiceValid';

describe('assertRightsizeServiceValid', () => {
  given('[case1] the supported AmazonEC2 service', () => {
    then('it passes without a throw', () => {
      expect(() =>
        assertRightsizeServiceValid({ service: 'AmazonEC2' }),
      ).not.toThrow();
    });
  });

  given('[case2] an unsupported service', () => {
    then('it fails loud with a BadRequestError', () => {
      expect(() =>
        assertRightsizeServiceValid({ service: 'AmazonRDS' }),
      ).toThrow(BadRequestError);
    });

    then('the user-directed fail-loud message matches the snapshot', () => {
      expect(() =>
        assertRightsizeServiceValid({ service: 'AmazonRDS' }),
      ).toThrowErrorMatchingSnapshot();
    });
  });
});
