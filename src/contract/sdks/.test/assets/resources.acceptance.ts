import { RefByUnique } from 'domain-objects';

import {
  calcCodeSha256,
  calcConfigSha256,
  DeclaredAwsIamRole,
  DeclaredAwsLambda,
  DeclaredAwsLambdaAlias,
  DeclaredAwsLambdaVersion,
  DeclaredAwsVpcTunnel,
  getDeclastructAwsProvider,
} from '../../../../../dist/contract/sdks';

/**
 * .what = provider configuration for AWS acceptance tests
 * .why = enables declastruct CLI to interact with AWS API
 * .note = requires AWS_PROFILE to be set via: source .agent/repo=.this/skills/use.dev.awsprofile.sh
 */
export const getProviders = async () => [
  await getDeclastructAwsProvider(
    {},
    {
      log: {
        info: () => {},
        debug: () => {},
        warn: console.warn,
        error: console.error,
      },
    },
  ),
];

/**
 * .what = resource declarations for AWS acceptance tests
 * .why = defines desired state of resources for testing
 */
export const getResources = async () => {
  // declare tunnel to open
  const tunnel = DeclaredAwsVpcTunnel.as({
    via: {
      mechanism: 'aws.ssm',
      bastion: { exid: 'vpc-main-bastion' },
    },
    into: {
      cluster: { name: 'ahbodedb' },
    },
    from: {
      host: 'localhost',
      port: 3_5432,
    },
    status: 'OPEN',
  });

  // declare iam role for lambda execution
  const lambdaRole = DeclaredAwsIamRole.as({
    name: 'declastruct-acceptance-lambda-role',
    path: '/',
    description: 'Role for declastruct acceptance test lambda',
    policies: [
      {
        effect: 'Allow',
        principal: { service: 'lambda.amazonaws.com' },
        action: 'sts:AssumeRole',
      },
    ],
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

  // declare lambda function
  const lambda = DeclaredAwsLambda.as({
    name: 'declastruct-acceptance-lambda',
    runtime: 'nodejs18.x',
    handler: 'index.handler',
    timeout: 30,
    memory: 128,
    role: RefByUnique.as<typeof DeclaredAwsIamRole>(lambdaRole),
    envars: { purpose: 'acceptance-test' },
    codeZipUri: './src/contract/sdks/.test/assets/lambda.sample.zip',
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

  // declare lambda version (publishes immutable snapshot)
  const lambdaWithCode = lambda as typeof lambda & { codeZipUri: string };
  const lambdaVersion = DeclaredAwsLambdaVersion.as({
    lambda: RefByUnique.as<typeof DeclaredAwsLambda>(lambda),
    codeSha256: calcCodeSha256({ of: lambdaWithCode }),
    configSha256: calcConfigSha256({ of: lambda }),
  });

  // declare lambda alias pointing to the version
  const lambdaAlias = DeclaredAwsLambdaAlias.as({
    name: 'LIVE',
    lambda: RefByUnique.as<typeof DeclaredAwsLambda>(lambda),
    version: RefByUnique.as<typeof DeclaredAwsLambdaVersion>(lambdaVersion),
    description: 'Live production alias',
  });

  return [tunnel, lambdaRole, lambda, lambdaVersion, lambdaAlias];
};
