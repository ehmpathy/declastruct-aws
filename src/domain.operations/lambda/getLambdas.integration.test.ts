import { given, then } from 'test-fns';

import { getSampleAwsApiContext } from '../../__test_assets__/getSampleAwsApiContext';
import { getLambdas } from './getLambdas';

const log = console;

describe('getLambdas', () => {
  const context = { log, ...getSampleAwsApiContext() };

  given('an account with lambdas', () => {
    then('we should be able to get a list', async () => {
      const lambdas = await getLambdas({ page: { limit: 1 } }, context);
      console.log(lambdas);
      expect(lambdas.length).toBeGreaterThan(0);
    });
  });
});
