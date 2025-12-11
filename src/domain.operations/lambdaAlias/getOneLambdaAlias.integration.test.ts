import { UnexpectedCodePathError } from 'helpful-errors';
import { given, then, useBeforeAll } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import { getAllLambdas } from '../lambda/getAllLambdas';
import { getAllLambdaAliases } from './getAllLambdaAliases';
import { getOneLambdaAlias } from './getOneLambdaAlias';

describe('getOneLambdaAlias', () => {
  const context = useBeforeAll(() => getSampleAwsApiContext());

  given('an existing lambda', () => {
    then('we should be able to list aliases', async () => {
      // find a lambda that exists
      const lambdas = await getAllLambdas({ page: { limit: 10 } }, context);
      const lambdaToCheck =
        lambdas[0] ??
        UnexpectedCodePathError.throw('no lambdas found in account');

      // list its aliases
      const aliases = await getAllLambdaAliases(
        { by: { lambda: { name: lambdaToCheck.name } } },
        context,
      );

      console.log(`Found ${aliases.length} aliases for ${lambdaToCheck.name}`);
      expect(Array.isArray(aliases)).toBe(true);

      // if there are aliases, check we can get one by unique
      if (aliases.length > 0) {
        const aliasToGet = aliases[0]!;
        console.log('Alias to get:', aliasToGet);

        const alias = await getOneLambdaAlias(
          {
            by: {
              unique: {
                lambda: { name: lambdaToCheck.name },
                name: aliasToGet.name,
              },
            },
          },
          context,
        );

        expect(alias).not.toBeNull();
        expect(alias?.name).toBe(aliasToGet.name);
        expect(alias?.lambda.name).toBe(lambdaToCheck.name);
        console.log('Found alias:', alias);
      } else {
        console.log('No aliases found for this lambda');
      }
    });
  });

  given('a lambda alias that does not exist', () => {
    then('we should get null', async () => {
      const alias = await getOneLambdaAlias(
        {
          by: {
            unique: {
              lambda: { name: 'declastruct-nonexistent-lambda' },
              name: 'NONEXISTENT',
            },
          },
        },
        context,
      );

      expect(alias).toBeNull();
    });
  });
});
