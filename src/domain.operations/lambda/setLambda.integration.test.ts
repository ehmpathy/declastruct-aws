import { given, then } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import { DeclaredAwsLambda } from '../../domain.objects/DeclaredAwsLambda';
import { setLambda } from './setLambda';

describe('setLambda', () => {
  const context = getSampleAwsApiContext();

  const lambdaDesired: DeclaredAwsLambda = {
    name: 'svc-example-prep-get-hello',

    runtime: 'nodejs18.x',
    role: { name: 'lambda-role' },
    handler: 'src/contract/getHello',
    timeout: 30,
    memory: 128,
    envars: {},
    codeZipUri: './src/.test/lambda.sample.zip',
  };

  // todo: unskip after role is provisioned
  then.skip('we should be able to set a lambda', async () => {
    const lambdaAfter = await setLambda(
      {
        upsert: lambdaDesired,
      },
      context,
    );
    console.log(lambdaAfter);
  });
});
