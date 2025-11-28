import { UnexpectedCodePathError } from 'helpful-errors';
import { given, then } from 'test-fns';

import { getSampleAwsApiContext } from '../../__test_assets__/getSampleAwsApiContext';
import { getLambda } from './getLambda';
import { getLambdas } from './getLambdas';

describe('getLambda', () => {
  const context = getSampleAwsApiContext();

  given('an live example lambda in this account', () => {
    then('we should be able to get its state', async () => {
      const lambdasByAccount = await getLambdas(
        { page: { limit: 1 } },
        context,
      );
      const lambdaNameToLookup =
        lambdasByAccount[0]?.name ??
        UnexpectedCodePathError.throw('no lambdas found?', {
          lambdasByAccount,
        });

      const lambdaByName =
        (await getLambda(
          {
            by: {
              unique: {
                name: lambdaNameToLookup,
                qualifier: null,
              },
            },
          },
          context,
        )) ??
        UnexpectedCodePathError.throw('lambda by name not found', {
          lambdasByAccount,
        });
      console.log(lambdaByName);
      expect(lambdaByName.name).toBe(lambdaNameToLookup);
      expect(lambdaByName.updatedAt).toBeDefined();
    });
  });
});
