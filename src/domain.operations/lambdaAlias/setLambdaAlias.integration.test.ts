import { given, then } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import { getOneLambda } from '../lambda/getOneLambda';
import { getAllLambdaVersions } from '../lambdaVersion/getAllLambdaVersions';
import { delLambdaAlias } from './delLambdaAlias';
import { getOneLambdaAlias } from './getOneLambdaAlias';
import { setLambdaAlias } from './setLambdaAlias';

describe('setLambdaAlias', () => {
  const context = getSampleAwsApiContext();

  const testLambdaName = 'declastruct-test-lambda';
  const testAliasName = 'INTEGRATION';

  given('a lambda with published versions', () => {
    then.skip('we should be able to create an alias', async () => {
      // check lambda exists
      const lambda = await getOneLambda(
        { by: { unique: { name: testLambdaName } } },
        context,
      );

      if (!lambda) {
        console.log(
          'Lambda not found - run setLambdaVersion integration test first',
        );
        return;
      }

      // get published versions
      const versions = await getAllLambdaVersions(
        { by: { lambda: { name: testLambdaName } } },
        context,
      );

      const publishedVersions = versions.filter(
        (v: { version: string }) => v.version !== '$LATEST',
      );
      if (publishedVersions.length === 0) {
        console.log(
          'No published versions - run setLambdaVersion integration test first',
        );
        return;
      }

      const versionToAlias = publishedVersions[0]!;
      console.log('Creating alias for version:', versionToAlias);

      // create alias
      const alias = await setLambdaAlias(
        {
          finsert: {
            name: testAliasName,
            lambda: { name: testLambdaName },
            version: {
              lambda: { name: testLambdaName },
              codeSha256: versionToAlias.codeSha256,
              configSha256: versionToAlias.configSha256,
            },
          },
        },
        context,
      );

      expect(alias.name).toBe(testAliasName);
      expect(alias.lambda.name).toBe(testLambdaName);
      console.log('Created alias:', alias);
    });

    then.skip('we should be able to get the alias we created', async () => {
      const alias = await getOneLambdaAlias(
        {
          by: {
            unique: {
              lambda: { name: testLambdaName },
              name: testAliasName,
            },
          },
        },
        context,
      );

      if (alias) {
        expect(alias.name).toBe(testAliasName);
        console.log('Found alias:', alias);
      } else {
        console.log('Alias not found - run create test first');
      }
    });

    then.skip('finsert should be idempotent for same version', async () => {
      const versions = await getAllLambdaVersions(
        { by: { lambda: { name: testLambdaName } } },
        context,
      );

      const publishedVersions = versions.filter(
        (v: { version: string }) => v.version !== '$LATEST',
      );
      if (publishedVersions.length === 0) {
        console.log('No published versions');
        return;
      }

      const versionToAlias = publishedVersions[0]!;

      // finsert same alias - should return existing
      const alias = await setLambdaAlias(
        {
          finsert: {
            name: testAliasName,
            lambda: { name: testLambdaName },
            version: {
              lambda: { name: testLambdaName },
              codeSha256: versionToAlias.codeSha256,
              configSha256: versionToAlias.configSha256,
            },
          },
        },
        context,
      );

      expect(alias.name).toBe(testAliasName);
      console.log('Idempotent alias:', alias);
    });

    then.skip('we should be able to delete the alias', async () => {
      const result = await delLambdaAlias(
        {
          by: {
            unique: {
              lambda: { name: testLambdaName },
              name: testAliasName,
            },
          },
        },
        context,
      );

      expect(result.deleted).toBe(true);
      console.log('Deleted alias');

      // verify it's gone
      const alias = await getOneLambdaAlias(
        {
          by: {
            unique: {
              lambda: { name: testLambdaName },
              name: testAliasName,
            },
          },
        },
        context,
      );

      expect(alias).toBeNull();
    });
  });
});
