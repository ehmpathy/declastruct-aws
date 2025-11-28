import { given, then } from 'test-fns';

import { getSampleAwsApiContext } from '../../__test_assets__/getSampleAwsApiContext';
import { DeclaredAwsLambda } from '../../domain.objects/DeclaredAwsLambda';
import { setLambda } from './setLambda';

describe('setLambda', () => {
  const context = getSampleAwsApiContext();

  const lambdaDesired: DeclaredAwsLambda & { codeZipUri: string } = {
    name: 'svc-example-prep-get-hello',
    qualifier: null,
    runtime: 'nodejs18.x',
    role: 'arn:aws:iam::123456789012:role/lambda-role',
    handler: 'src/contract/getHello',
    timeout: 30,
    memory: 128,
    envars: {},
    codeZipUri: './src/__test_assets__/lambda.sample.zip',
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
