import { asUniDateTime, UniDateTime } from '@ehmpathy/uni-time';
import { endOfDay, startOfDay, subDays } from 'date-fns';
import { RefByUnique } from 'domain-objects';

import {
  calcCodeSha256,
  calcConfigSha256,
  DeclaredAwsIamRole,
  DeclaredAwsIamRolePolicyAttachedInline,
  DeclaredAwsLambda,
  DeclaredAwsLambdaAlias,
  DeclaredAwsLambdaVersion,
  DeclaredAwsLogGroup,
  DeclaredAwsLogGroupReportCostOfIngestion,
  DeclaredAwsLogGroupReportDistOfPattern,
  DeclaredAwsVpcTunnel,
  getDeclastructAwsProvider,
} from '../../../../../dist/contract/sdks';

/**
 * .what = time range for log group reports (last 7 days up to now)
 * .why = enables querying recent logs for acceptance testing
 */
const logGroupReportRange = {
  since: asUniDateTime(startOfDay(subDays(new Date(), 7))),
  until: asUniDateTime(endOfDay(new Date())),
};

/**
 * .what = provider configuration for AWS acceptance tests
 * .why = enables declastruct CLI to interact with AWS API
 * .note = requires AWS_PROFILE to be set via: source .agent/repo=.this/skills/use.demo.awsprofile.sh
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
  // TODO: provision vpc, bastion machine, and rds db in demo account
  // // declare tunnel to open
  // const tunnel = DeclaredAwsVpcTunnel.as({
  //   via: {
  //     mechanism: 'aws.ssm',
  //     bastion: { exid: 'vpc-main-bastion' },
  //   },
  //   into: {
  //     cluster: { name: 'ahbodedb' },
  //   },
  //   from: {
  //     host: 'localhost',
  //     port: 3_5432,
  //   },
  //   status: 'OPEN',
  // });

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

  // declare inline policy for CloudWatch Logs permissions
  const lambdaRolePolicy = DeclaredAwsIamRolePolicyAttachedInline.as({
    name: 'cloudwatch-logs',
    role: RefByUnique.as<typeof DeclaredAwsIamRole>(lambdaRole),
    document: {
      statements: [
        {
          effect: 'Allow',
          action: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents',
          ],
          resource: '*',
        },
      ],
    },
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

  // declare log group with retention policy
  const logGroupWithRetention = DeclaredAwsLogGroup.as({
    name: '/declastruct/acceptance-test/with-retention',
    class: 'STANDARD',
    kmsKeyId: null,
    retentionInDays: 14,
  });

  // declare log group report for pattern distribution (message frequency)
  const logGroupReportDistOfPattern = DeclaredAwsLogGroupReportDistOfPattern.as(
    {
      logGroups: [
        RefByUnique.as<typeof DeclaredAwsLogGroup>({
          name: `/aws/lambda/${lambda.name}`,
        }),
      ],
      range: logGroupReportRange,
      pattern: '@message',
      filter: null,
      limit: 100,
    },
  );

  // declare log group report for ingestion cost
  const logGroupReportCostOfIngestion =
    DeclaredAwsLogGroupReportCostOfIngestion.as({
      logGroupFilter: { names: [`/aws/lambda/${lambda.name}`] },
      range: logGroupReportRange,
    });

  return [
    // tunnel,
    lambdaRole,
    lambdaRolePolicy,
    lambda,
    lambdaVersion,
    lambdaAlias,
    logGroupWithRetention,
    logGroupReportDistOfPattern,
    logGroupReportCostOfIngestion,
  ];
};
