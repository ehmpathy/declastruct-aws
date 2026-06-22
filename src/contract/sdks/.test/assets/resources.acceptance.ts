import { asUniDateTime, UniDateTime } from '@ehmpathy/uni-time';
import { endOfDay, startOfDay, subDays } from 'date-fns';
import { del } from 'declastruct';
import { RefByUnique } from 'domain-objects';
import { ConstraintError } from 'helpful-errors';

import {
  calcAwsLambdaConfigHash,
  DeclaredAwsEc2Instance,
  DeclaredAwsEc2InstanceSession,
  DeclaredAwsEc2LaunchTemplate,
  DeclaredAwsIamRole,
  DeclaredAwsIamRolePolicyAttachedInline,
  DeclaredAwsLambda,
  DeclaredAwsLambdaAlias,
  DeclaredAwsLambdaVersion,
  DeclaredAwsLogGroup,
  DeclaredAwsLogGroupReportCostOfIngestion,
  DeclaredAwsLogGroupReportDistOfPattern,
  DeclaredAwsVpc,
  DeclaredAwsVpcCidrBlock,
  DeclaredAwsVpcInternetGateway,
  DeclaredAwsVpcRouteTable,
  DeclaredAwsVpcSecurityGroup,
  DeclaredAwsVpcSecurityGroupRule,
  DeclaredAwsVpcSubnet,
  DeclaredAwsVpcTunnel,
  genDeclaredAwsLambdaCode,
  getAllIamUserAccessKeys,
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
  // declare vpc
  const vpc = DeclaredAwsVpc.as({
    exid: 'declastruct-acceptance-vpc',
    cidr: {
      v4: '10.0.0.0/16',
    },
    dns: {
      hostnames: 'enabled',
      support: 'enabled',
    },
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

  // declare subnet
  const subnet = DeclaredAwsVpcSubnet.as({
    exid: 'declastruct-acceptance-subnet-1a',
    vpc: { exid: vpc.exid },
    cidr: { v4: '10.0.1.0/24' },
    zone: { availability: 'us-east-1a' },
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

  // declare security group
  const securityGroup = DeclaredAwsVpcSecurityGroup.as({
    exid: 'declastruct-acceptance-sg',
    vpc: { exid: vpc.exid },
    name: 'declastruct-acceptance-sg',
    description: 'security group for declastruct acceptance instances',
    rules: {
      ingress: [],
      egress: [
        DeclaredAwsVpcSecurityGroupRule.as({
          protocol: 'all',
          port: { from: 0, upto: 0 },
          cidrs: [DeclaredAwsVpcCidrBlock.as({ v4: '0.0.0.0/0' })],
          description: 'allow all outbound',
        }),
      ],
    },
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

  // declare internet gateway
  const internetGateway = DeclaredAwsVpcInternetGateway.as({
    exid: 'declastruct-acceptance-igw',
    vpc: { exid: vpc.exid },
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

  // declare route table
  const routeTable = DeclaredAwsVpcRouteTable.as({
    exid: 'declastruct-acceptance-rtb',
    vpc: { exid: vpc.exid },
    routes: [
      {
        destination: { cidr: DeclaredAwsVpcCidrBlock.as({ v4: '0.0.0.0/0' }) },
        target: { gatewayInternet: { exid: internetGateway.exid } },
      },
    ],
    associations: [{ subnet: { exid: subnet.exid } }],
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

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

  // declare lambda function with code from zip
  const zipUri = './src/contract/sdks/.test/assets/lambda.sample.zip';
  const lambda = DeclaredAwsLambda.as({
    name: 'declastruct-acceptance-lambda',
    runtime: 'nodejs18.x',
    handler: 'index.handler',
    timeout: 30,
    memory: 128,
    role: RefByUnique.as<typeof DeclaredAwsIamRole>(lambdaRole),
    envars: { purpose: 'acceptance-test' },
    code: genDeclaredAwsLambdaCode({ zipUri }),
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

  // declare lambda version (publishes immutable snapshot)
  const lambdaVersion = DeclaredAwsLambdaVersion.as({
    lambda: RefByUnique.as<typeof DeclaredAwsLambda>(lambda),
    hash: {
      code:
        lambda.code?.hash ??
        ConstraintError.throw('lambda.code.hash is required'),
      config: calcAwsLambdaConfigHash({ of: lambda }),
    },
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

  // get provider context to fetch current access keys
  const [provider] = await getProviders();

  // declare EC2 launch template with hibernation support
  const ec2LaunchTemplate = DeclaredAwsEc2LaunchTemplate.as({
    exid: 'declastruct-acceptance-template',
    instanceType: 't3.micro',
    imageId: 'ami-0453ec754f44f9a4a', // Amazon Linux 2023 (us-east-1) — supports hibernation
    hibernation: true,
    rootVolumeSize: 16, // hibernation needs enough space for RAM
    rootVolumeEncrypted: true, // required for hibernation
    iamInstanceProfile: null,
    userData: null,
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

  // declare EC2 instance with acceptance VPC resources
  const ec2Instance = DeclaredAwsEc2Instance.as({
    exid: 'declastruct-acceptance-instance',
    template: RefByUnique.as<typeof DeclaredAwsEc2LaunchTemplate>(
      ec2LaunchTemplate,
    ),
    subnet: { exid: subnet.exid },
    securityGroups: [{ exid: securityGroup.exid }],
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

  // declare EC2 instance session (stopped to avoid charges when idle)
  const ec2InstanceSession = DeclaredAwsEc2InstanceSession.as({
    instance: RefByUnique.as<typeof DeclaredAwsEc2Instance>(ec2Instance),
    status: 'stopped',
  });

  /**
   * .skip = SCP resources require management account credentials
   *   - test profile (ehmpathy.demo) is a member account
   *   - Organizations API returns AccessDeniedException from member accounts
   *   - verify SCP via yalc in consumer repo with management account access
   */

  // get all IAM access keys and mark for deletion
  const accessKeysToDelete = await getAllIamUserAccessKeys(
    { by: { account: { id: provider.context.aws.credentials.account } } },
    provider.context,
  ).then((keys) => keys.map((key) => del(key)));

  return [
    // vpc infrastructure
    vpc,
    subnet,
    securityGroup,
    internetGateway,
    routeTable,
    // tunnel,
    lambdaRole,
    lambdaRolePolicy,
    lambda,
    lambdaVersion,
    lambdaAlias,
    logGroupWithRetention,
    logGroupReportDistOfPattern,
    logGroupReportCostOfIngestion,
    // ec2 infrastructure
    ec2LaunchTemplate,
    ec2Instance,
    ec2InstanceSession,
    // SCP resources skipped — require management account credentials (see .skip note above)
    ...accessKeysToDelete,
  ];
};
