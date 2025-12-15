import { given, then, useBeforeAll } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import type { DeclaredAwsLambda } from '../../domain.objects/DeclaredAwsLambda';
import { setIamRole } from '../iamRole/setIamRole';
import { getOneLambda } from './getOneLambda';
import { setLambda } from './setLambda';

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

  const lambdaDesired: Omit<DeclaredAwsLambda, 'arn'> = {
    name: testLambdaName,
    runtime: 'nodejs20.x',
    role: { name: testRoleName },
    handler: 'index.handler',
    timeout: 30,
    memory: 128,
    envars: {},
    codeZipUri: './src/contract/sdks/.test/assets/lambda.sample.zip',
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
});
