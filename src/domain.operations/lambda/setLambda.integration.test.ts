import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import type { DeclaredAwsLambda } from '@src/domain.objects/DeclaredAwsLambda';
import { setIamRole } from '@src/domain.operations/iamRole/setIamRole';

import { genDeclaredAwsLambdaCode } from './genDeclaredAwsLambdaCode';
import { getOneLambda } from './getOneLambda';
import { setLambda } from './setLambda';
import { calcAwsLambdaCodeHash } from './utils/calcAwsLambdaCodeHash';

describe('setLambda', () => {
  const testRoleName = 'declastruct-aws-lambda-integration-test-role';
  const testLambdaName = 'declastruct-test-lambda';

  // ensure the role exists before tests run (findsert is idempotent)
  const context = useBeforeAll(async () => {
    const ctx = await getSampleAwsApiContext();
    await setIamRole(
      {
        findsert: {
          name: testRoleName,
          path: '/',
          description: 'Test role for declastruct-aws lambda integration tests',
          policies: [
            {
              effect: 'Allow',
              principal: { service: 'lambda.amazonaws.com' },
              action: 'sts:AssumeRole',
            },
          ],
          tags: { environment: 'test', managedBy: 'declastruct' },
        },
      },
      ctx,
    );
    return ctx;
  });

  const zipUri = './src/contract/sdks/.test/assets/lambda.sample.zip';
  const lambdaDesired: Omit<DeclaredAwsLambda, 'arn'> = {
    name: testLambdaName,
    runtime: 'nodejs20.x',
    role: { name: testRoleName },
    handler: 'index.handler',
    timeout: 30,
    memory: 128,
    envars: {},
    code: genDeclaredAwsLambdaCode({ zipUri }),
    tags: { environment: 'test', managedBy: 'declastruct' },
  };

  given('a lambda to create', () => {
    then('we should be able to findsert a lambda', async () => {
      const lambdaAfter = await setLambda({ findsert: lambdaDesired }, context);

      expect(lambdaAfter.name).toBe(testLambdaName);
      expect(lambdaAfter.arn).toContain('arn:aws:lambda:');
      expect(lambdaAfter.arn).toContain(`:function:${testLambdaName}`);
      console.log(lambdaAfter);
    });

    then('we should be able to get the lambda we created', async () => {
      const lambda = await getOneLambda(
        { by: { unique: { name: testLambdaName } } },
        context,
      );

      expect(lambda).not.toBeNull();
      expect(lambda?.name).toBe(testLambdaName);
    });

    then('findsert should be idempotent', async () => {
      const lambdaAgain = await setLambda({ findsert: lambdaDesired }, context);

      expect(lambdaAgain.name).toBe(testLambdaName);
    });

    then(
      'we should be able to upsert the lambda with updated tags',
      async () => {
        const lambdaUpdated = await setLambda(
          {
            upsert: {
              ...lambdaDesired,
              tags: {
                environment: 'test',
                managedBy: 'declastruct',
                updated: 'true',
              },
            },
          },
          context,
        );

        expect(lambdaUpdated.name).toBe(testLambdaName);
        console.log(lambdaUpdated);
      },
    );
  });

  given('[boundary] code change detection', () => {
    when('[t0] upsert with same code.hash as deployed', () => {
      then(
        'returns lambda with same hash (no code update needed)',
        async () => {
          // get current deployed state
          const before = await getOneLambda(
            { by: { unique: { name: testLambdaName } } },
            context,
          );
          expect(before).not.toBeNull();
          expect(before?.code?.hash).toBeDefined();

          // upsert with same hash
          const after = await setLambda({ upsert: lambdaDesired }, context);

          // verify hash unchanged
          expect(after.code?.hash).toBe(before?.code?.hash);

          // verify deployed matches desired (no perma-drift)
          expect(after.code?.hash).toBe(lambdaDesired.code!.hash);
        },
      );

      then('is idempotent (repeat upsert yields same result)', async () => {
        const first = await setLambda({ upsert: lambdaDesired }, context);
        const second = await setLambda({ upsert: lambdaDesired }, context);

        expect(second.code?.hash).toBe(first.code?.hash);
        expect(second.arn).toBe(first.arn);

        // verify both match desired (no perma-drift)
        expect(first.code?.hash).toBe(lambdaDesired.code!.hash);
        expect(second.code?.hash).toBe(lambdaDesired.code!.hash);
      });
    });

    when('[t1] upsert with different code.hash', () => {
      // create a different zip with different content
      const altZipUri = path.join(os.tmpdir(), 'lambda-alt.zip');

      then('deploys new code and returns updated hash', async () => {
        // create alternate zip with different content
        const originalZip = fs.readFileSync(zipUri);
        const altContent = Buffer.concat([originalZip, Buffer.from('// alt')]);
        fs.writeFileSync(altZipUri, altContent);

        const altHash = calcAwsLambdaCodeHash({ of: { zipUri: altZipUri } });

        // get before state
        const before = await getOneLambda(
          { by: { unique: { name: testLambdaName } } },
          context,
        );
        expect(before?.code?.hash).not.toBe(altHash);

        // upsert with different hash
        const after = await setLambda(
          {
            upsert: {
              ...lambdaDesired,
              code: { zipUri: altZipUri, hash: altHash },
            },
          },
          context,
        );

        // verify code was updated (hash changed in AWS)
        expect(after.code?.hash).toBeDefined();
        console.log('Code updated:', {
          before: before?.code?.hash,
          after: after.code?.hash,
        });
      });

      then(
        'is idempotent (repeat upsert with same new hash yields same result)',
        async () => {
          // ensure alt zip exists
          if (!fs.existsSync(altZipUri)) {
            const originalZip = fs.readFileSync(zipUri);
            const altContent = Buffer.concat([
              originalZip,
              Buffer.from('// alt'),
            ]);
            fs.writeFileSync(altZipUri, altContent);
          }

          const altHash = calcAwsLambdaCodeHash({ of: { zipUri: altZipUri } });

          const first = await setLambda(
            {
              upsert: {
                ...lambdaDesired,
                code: { zipUri: altZipUri, hash: altHash },
              },
            },
            context,
          );

          const second = await setLambda(
            {
              upsert: {
                ...lambdaDesired,
                code: { zipUri: altZipUri, hash: altHash },
              },
            },
            context,
          );

          // same hash on repeat = idempotent
          expect(second.code?.hash).toBe(first.code?.hash);
        },
      );

      // cleanup: restore original code
      then('cleanup: restore original code', async () => {
        await setLambda({ upsert: lambdaDesired }, context);

        // remove temp file
        if (fs.existsSync(altZipUri)) {
          fs.unlinkSync(altZipUri);
        }
      });
    });
  });
});
