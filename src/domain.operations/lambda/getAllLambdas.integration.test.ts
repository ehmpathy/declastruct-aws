import { given, then } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import { getAllLambdas } from './getAllLambdas';

describe('getAllLambdas', () => {
  const context = getSampleAwsApiContext();

  given('an account with lambdas', () => {
    then('we should be able to get a list', async () => {
      const lambdas = await getAllLambdas({ page: { limit: 1 } }, context);
      console.log(lambdas);
      expect(lambdas.length).toBeGreaterThan(0);
    });
  });
});
