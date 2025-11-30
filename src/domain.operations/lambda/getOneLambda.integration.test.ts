import { UnexpectedCodePathError } from 'helpful-errors';
import { given, then } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import { getAllLambdas } from './getAllLambdas';
import { getOneLambda } from './getOneLambda';

describe('getOneLambda', () => {
  const context = getSampleAwsApiContext();

  given('an live example lambda in this account', () => {
    then('we should be able to get its state', async () => {
      const lambdasByAccount = await getAllLambdas(
        { page: { limit: 1 } },
        context,
      );
      const lambdaNameToLookup =
        lambdasByAccount[0]?.name ??
        UnexpectedCodePathError.throw('no lambdas found?', {
          lambdasByAccount,
        });

      const lambdaByName =
        (await getOneLambda(
          {
            by: {
              unique: {
                name: lambdaNameToLookup,
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
