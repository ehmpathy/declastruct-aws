import { UnexpectedCodePathError } from 'helpful-errors';
import { given, then, useBeforeAll } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import { getAllLambdas } from '../lambda/getAllLambdas';
import { getAllLambdaVersions } from './getAllLambdaVersions';
import { getOneLambdaVersion } from './getOneLambdaVersion';

describe('getOneLambdaVersion', () => {
  const context = useBeforeAll(() => getSampleAwsApiContext());

  given('an existing lambda with published versions', () => {
    then('we should be able to list versions', async () => {
      // find a lambda that exists
      const lambdas = await getAllLambdas({ page: { limit: 10 } }, context);
      const lambdaToCheck =
        lambdas[0] ??
        UnexpectedCodePathError.throw('no lambdas found in account');

      // list its versions
      const versions = await getAllLambdaVersions(
        { by: { lambda: { name: lambdaToCheck.name } } },
        context,
      );

      console.log(
        `Found ${versions.length} versions for ${lambdaToCheck.name}`,
      );
      expect(Array.isArray(versions)).toBe(true);

      // if there are published versions (not just $LATEST), check we can get one
      const publishedVersions = versions.filter(
        (v: { version: string }) => v.version !== '$LATEST',
      );
      if (publishedVersions.length > 0) {
        const versionToGet = publishedVersions[0]!;
        console.log('Version to get:', versionToGet);

        const version = await getOneLambdaVersion(
          {
            by: {
              unique: {
                lambda: { name: lambdaToCheck.name },
                codeSha256: versionToGet.codeSha256,
                configSha256: versionToGet.configSha256,
              },
            },
          },
          context,
        );

        expect(version).not.toBeNull();
        expect(version?.lambda.name).toBe(lambdaToCheck.name);
        console.log('Found version:', version);
      } else {
        console.log('No published versions found - only $LATEST');
      }
    });
  });

  given('a lambda version that does not exist', () => {
    then('we should get null', async () => {
      const version = await getOneLambdaVersion(
        {
          by: {
            unique: {
              lambda: { name: 'declastruct-nonexistent-lambda' },
              codeSha256: 'abc123',
              configSha256: 'def456',
            },
          },
        },
        context,
      );

      expect(version).toBeNull();
    });
  });
});
