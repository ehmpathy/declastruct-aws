import { given, then } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import { getLambdas } from './getLambdas';

describe('getLambdas', () => {
  const context = getSampleAwsApiContext();

  given('an account with lambdas', () => {
    then('we should be able to get a list', async () => {
      const lambdas = await getLambdas({ page: { limit: 1 } }, context);
      console.log(lambdas);
      expect(lambdas.length).toBeGreaterThan(0);
    });
  });
});
