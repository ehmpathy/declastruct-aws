import { asUniDateTime, UniDateTime } from '@ehmpathy/uni-time';
import { endOfDay, startOfDay, subDays } from 'date-fns';
import { del } from 'declastruct';
import { RefByPrimary, RefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { keyrack } from 'rhachet/keyrack';
import { genLogMethods, LogLevel } from 'sdk-logs';

import {
  COST_REPORT_BY_RESOURCE_RANGE,
  COST_REPORT_FORECAST_RANGE,
  COST_REPORT_OBSERVED_RANGE,
} from './costReportRanges';

// source aws credentials from keyrack
keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'lenient' });

import {
  calcAwsLambdaConfigHash,
  DeclaredAwsBudget,
  DeclaredAwsBudgetAction,
  DeclaredAwsBudgetNotification,
  DeclaredAwsCloudwatchMetricAlarm,
  DeclaredAwsCostAnomalyMonitor,
  DeclaredAwsCostAnomalySubscription,
  DeclaredAwsEc2Instance,
  DeclaredAwsEc2InstanceSession,
  DeclaredAwsEc2LaunchTemplate,
  DeclaredAwsEc2SshKeyAuthorized,
  DeclaredAwsIamInstanceProfile,
  DeclaredAwsIamPolicy,
  DeclaredAwsIamRole,
  DeclaredAwsIamRolePolicyAttachedInline,
  DeclaredAwsIamRolePolicyAttachedManaged,
  DeclaredAwsLambda,
  DeclaredAwsLambdaAlias,
  DeclaredAwsLambdaVersion,
  DeclaredAwsCloudwatchLogGroup,
  DeclaredAwsCloudwatchLogGroupReportCostOfIngestion,
  DeclaredAwsCloudwatchLogGroupReportDistOfPattern,
  DeclaredAwsCostReportRecommendationsToPurchasePlan,
  DeclaredAwsCostReportRecommendationsToRightsize,
  DeclaredAwsCostReportSpendForecast,
  DeclaredAwsCostReportSpendObserved,
  DeclaredAwsCostReportSpendObservedByResource,
  DeclaredAwsSsmParameterPlain,
  DeclaredAwsSsmParameterSecure,
  DeclaredAwsSsmSshTunnel,
  DeclaredAwsVpc,
  DeclaredAwsVpcCidrBlock,
  DeclaredAwsVpcInternetGateway,
  DeclaredAwsVpcRouteTable,
  DeclaredAwsVpcSecurityGroup,
  DeclaredAwsVpcSecurityGroupRule,
  DeclaredAwsVpcSubnet,
  DeclaredAwsSsmVpcTunnel,
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

// the FIXED cost-report ranges — shared with declastruct.acceptance.test.ts via one
// exported const so the wish's declared @unique and the test's DAO read can never desync.
// see costReportRanges.ts for the identity-vs-recency (option-a) rationale + refresh note
const costReportObservedRange = COST_REPORT_OBSERVED_RANGE;
const costReportForecastRange = COST_REPORT_FORECAST_RANGE;
const costReportByResourceRange = COST_REPORT_BY_RESOURCE_RANGE;

/**
 * .what = Amazon Linux 2023 AMI (x86_64, us-east-1) used for the NAT instance
 * .why = stable base image with the tools the NAT user data needs
 */
const AL2023_AMI_US_EAST_1 = 'ami-0453ec754f44f9a4a';

/**
 * .what = a stable, throwaway ed25519 public key for the ssh key authorization
 * .why = EC2 Instance Connect needs a syntactically valid key; the private half is
 *   discarded (acceptance verifies the authorization is recorded, never sshes in).
 *   it must stay stable so the declared publicKey matches the recorded one -> KEEP.
 * .note = to rotate, see the .reseed steps on the ec2SshKeyAuthorized declaration
 */
const ACCEPTANCE_SSH_PUBLIC_KEY =
  'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAID5+jzBfFTQMe+mQrsxNcg93UbqhqV8sCb8e+sG47JCD declastruct-acceptance-seed';

/**
 * .what = user data that turns a plain instance into a NAT (fck-nat style)
 * .why = enables IP forward + iptables masquerade so the private subnet can egress
 * .note
 *   - detects the primary interface dynamically (AL2023/Nitro names it ens5)
 *   - masquerade rules persist across stop/start via iptables-services + sysctl
 *   - auto-stops 90 min after each boot for cost control; a systemd timer re-arms
 *     on every boot (a one-shot user-data sleep would fire only on first boot)
 *   - a self-stop survives test crashes, so an orphaned NAT cannot bill forever
 *   - source/dest check is disabled declaratively via the instance, not here
 */
const NAT_USER_DATA = `#!/bin/bash
set -e

# detect the primary network interface (the one with the default route)
PRIMARY_IFACE=$(ip -o -4 route show to default | awk '{print $5}' | head -n1)

# enable IP forward (persists across reboots via sysctl.conf)
echo 1 > /proc/sys/net/ipv4/ip_forward
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf

# configure iptables NAT (masquerade); iptables-services restores it on each boot
yum install -y iptables-services
systemctl enable iptables
iptables -t nat -A POSTROUTING -o "$PRIMARY_IFACE" -j MASQUERADE
iptables -A FORWARD -i "$PRIMARY_IFACE" -o "$PRIMARY_IFACE" -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -i "$PRIMARY_IFACE" -o "$PRIMARY_IFACE" -j ACCEPT
service iptables save

# auto-stop 90 min after each boot (cost control; survives test crashes)
cat > /etc/systemd/system/nat-idle-stop.service <<'UNIT'
[Unit]
Description=stop this NAT for idle cost control

[Service]
Type=oneshot
ExecStart=/sbin/shutdown -h now
UNIT
cat > /etc/systemd/system/nat-idle-stop.timer <<'UNIT'
[Unit]
Description=stop this NAT 90 min after boot

[Timer]
OnBootSec=5400

[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now nat-idle-stop.timer
`;

/**
 * .what = provider configuration for AWS acceptance tests
 * .why = enables declastruct CLI to interact with AWS API
 * .note = requires AWS_PROFILE to be set via: source .agent/repo=.this/skills/use.demo.awsprofile.sh
 */
export const getProviders = async () => [
  await getDeclastructAwsProvider(
    {},
    { log: genLogMethods({ level: { minimum: LogLevel.WARN } }) },
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

  // declare public subnet (for fck-nat gateway — needs public IP and IGW route)
  const subnetPublic = DeclaredAwsVpcSubnet.as({
    exid: 'declastruct-acceptance-subnet-public-1a',
    vpc: { exid: vpc.exid },
    cidr: { v4: '10.0.1.0/24' },
    zone: { availability: 'us-east-1a' },
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

  // declare private subnet (for EC2 instances — no public IP, routes via NAT)
  const subnetPrivate = DeclaredAwsVpcSubnet.as({
    exid: 'declastruct-acceptance-subnet-private-1a',
    vpc: { exid: vpc.exid },
    cidr: { v4: '10.0.2.0/24' },
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
      ingress: [
        DeclaredAwsVpcSecurityGroupRule.as({
          protocol: 'all',
          port: { from: 0, upto: 0 },
          cidrs: [DeclaredAwsVpcCidrBlock.as({ v4: '10.0.0.0/16' })],
          description:
            'allow all inbound from within vpc - required so the ephemeral NAT instance can receive and forward egress traffic from the private subnet',
        }),
      ],
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

  // declare public route table (routes to internet gateway for fck-nat egress)
  const routeTablePublic = DeclaredAwsVpcRouteTable.as({
    exid: 'declastruct-acceptance-rtb-public',
    vpc: { exid: vpc.exid },
    routes: [
      {
        destination: { cidr: DeclaredAwsVpcCidrBlock.as({ v4: '0.0.0.0/0' }) },
        target: { gatewayInternet: { exid: internetGateway.exid } },
      },
    ],
    associations: [{ subnet: { exid: subnetPublic.exid } }],
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

  // declare private route table (egress routes through the declared NAT instance)
  const routeTablePrivate = DeclaredAwsVpcRouteTable.as({
    exid: 'declastruct-acceptance-rtb-private',
    vpc: { exid: vpc.exid },
    routes: [
      {
        destination: { cidr: DeclaredAwsVpcCidrBlock.as({ v4: '0.0.0.0/0' }) },
        target: { instanceNat: { instance: { exid: 'declastruct-acceptance-nat' } } },
      },
    ],
    associations: [{ subnet: { exid: subnetPrivate.exid } }],
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

  // TODO: provision vpc, bastion machine, and rds db in demo account
  // // declare tunnel to open
  // const tunnel = DeclaredAwsSsmVpcTunnel.as({
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
        // exercises the { exclude } scope -> NotResource serialize + round-trip;
        // harmless to the lambda (it uses no ssm), but proves the deny-all-except idiom
        {
          sid: 'DenyNonPlanSsmParameters',
          effect: 'Deny',
          action: 'ssm:GetParameter*',
          resource: {
            exclude:
              'arn:aws:ssm:*:*:parameter/declastruct-acceptance/scope=plan/*',
          },
        },
      ],
    },
  });

  // declare IAM role for EC2 instances (enables SSM connectivity)
  const ec2Role = DeclaredAwsIamRole.as({
    name: 'declastruct-acceptance-ec2-role',
    path: '/',
    description: 'Role for declastruct acceptance test EC2 instances',
    policies: [
      {
        effect: 'Allow',
        principal: { service: 'ec2.amazonaws.com' },
        action: 'sts:AssumeRole',
      },
    ],
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

  // attach AWS managed SSM policy for SSM agent connectivity
  const ec2RoleSsmPolicy = DeclaredAwsIamRolePolicyAttachedManaged.as({
    role: RefByUnique.as<typeof DeclaredAwsIamRole>(ec2Role),
    policy: RefByPrimary.as<typeof DeclaredAwsIamPolicy>({
      arn: 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore',
    }),
  });

  // declare instance profile for EC2 instances
  const ec2InstanceProfile = DeclaredAwsIamInstanceProfile.as({
    name: 'declastruct-acceptance-ec2-profile',
    role: RefByUnique.as<typeof DeclaredAwsIamRole>(ec2Role),
    path: '/',
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

  // declare NAT launch template (masquerade via user data; reuses the SSM profile)
  const natLaunchTemplate = DeclaredAwsEc2LaunchTemplate.as({
    exid: 'declastruct-acceptance-nat-template',
    instanceType: 't3.micro', // free-tier eligible
    imageId: AL2023_AMI_US_EAST_1,
    hibernation: false,
    rootVolumeSize: 8,
    rootVolumeEncrypted: false,
    iamInstanceProfile: RefByUnique.as<typeof DeclaredAwsIamInstanceProfile>(
      ec2InstanceProfile,
    ),
    userData: NAT_USER_DATA,
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

  // declare NAT instance in the public subnet (egress for the private subnet)
  // note: publicIpEnabled -> reachable internet; sourceDestChecked:false -> can forward
  const natInstance = DeclaredAwsEc2Instance.as({
    exid: 'declastruct-acceptance-nat',
    template: RefByUnique.as<typeof DeclaredAwsEc2LaunchTemplate>(
      natLaunchTemplate,
    ),
    network: {
      subnet: { exid: subnetPublic.exid },
      security: { groups: [{ exid: securityGroup.exid }] },
      interface: { publicIpEnabled: true, sourceDestChecked: false },
    },
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

  // note: the NAT instance's lifecycle state is intentionally NOT declared.
  //   - the NAT auto-stops 90 min after boot (cost control via its user data)
  //   - a declared `active` session would then show perpetual drift
  //   - tests that need egress start it on demand in beforeAll, idempotently

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
        UnexpectedCodePathError.throw('lambda.code.hash is required'),
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
  const logGroupWithRetention = DeclaredAwsCloudwatchLogGroup.as({
    name: '/declastruct/acceptance-test/with-retention',
    class: 'STANDARD',
    kmsKeyId: null,
    retentionInDays: 14,
  });

  // declare log group report for pattern distribution (message frequency)
  const logGroupReportDistOfPattern = DeclaredAwsCloudwatchLogGroupReportDistOfPattern.as(
    {
      logGroups: [
        RefByUnique.as<typeof DeclaredAwsCloudwatchLogGroup>({
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
    DeclaredAwsCloudwatchLogGroupReportCostOfIngestion.as({
      logGroupFilter: { names: [`/aws/lambda/${lambda.name}`] },
      range: logGroupReportRange,
    });

  // declare cost report: observed spend, grouped by service (GetCostAndUsage)
  // note: `metric: 'UnblendedCost'` is a DISCLOSED default choice, not a silent one.
  //   UnblendedCost is GROSS (pre-credit) list-price cost; NetUnblendedCost /
  //   NetAmortizedCost are net-of-credits (what actually leaves the bill). the vision
  //   flags gross-vs-net as a wisher fork (the wish says "where money GOES" = cash-out =
  //   net). the field is fully flexible — this fixture picks the common gross default
  const costReportSpendObserved = DeclaredAwsCostReportSpendObserved.as({
    range: costReportObservedRange,
    granularity: 'MONTHLY',
    groupBy: { dimension: 'SERVICE' },
    filter: null,
    metric: 'UnblendedCost',
  });

  // declare cost report: observed spend by RESOURCE_ID (GetCostAndUsageWithResources)
  // note: this report REQUIRES a filter (pin SERVICE to a single service) + the FREE
  //   "resource-level data at daily granularity" opt-in (only the separate hourly tier is
  //   paid). when the opt-in is off (the default on a fresh account) the read DEGRADES to an
  //   empty report (see getOneCostReportSpendObservedByResource), so acceptance proves the
  //   read + KEEP without the opt-in. the range is derived off `now` (last 13 days) to stay
  //   inside the ~14-day resource-level retention window
  const costReportSpendObservedByResource =
    DeclaredAwsCostReportSpendObservedByResource.as({
      range: costReportByResourceRange,
      granularity: 'DAILY',
      filter: {
        dimension: 'SERVICE',
        values: ['Amazon Elastic Compute Cloud - Compute'],
      },
      metric: 'UnblendedCost',
    });

  // declare cost report: forecast spend (GetCostForecast)
  // note: GetCostForecast can DataUnavailable on a young/low-spend account (the read
  //   degrades to an empty forecast, see getOneCostReportSpendForecast). `metric` carries
  //   the same disclosed gross-vs-net default as the observed report above
  const costReportSpendForecast = DeclaredAwsCostReportSpendForecast.as({
    range: costReportForecastRange,
    granularity: 'MONTHLY',
    metric: 'UnblendedCost',
    filter: null,
    predictionInterval: 80,
  });

  // declare cost report: rightsize recommendations (GetRightsizingRecommendation)
  const costReportRecommendationsToRightsize =
    DeclaredAwsCostReportRecommendationsToRightsize.as({
      service: 'AmazonEC2',
      recommendationTarget: 'SAME_INSTANCE_FAMILY',
      benefitsConsidered: true,
      filter: null,
    });

  // declare cost report: savings-plan purchase recommendations
  // note: LINKED scope so a member account reads its own recs (no payer wall)
  const costReportRecommendationsToPurchasePlan =
    DeclaredAwsCostReportRecommendationsToPurchasePlan.as({
      savingsPlansType: 'COMPUTE_SP',
      termInYears: 'ONE_YEAR',
      paymentOption: 'NO_UPFRONT',
      lookbackDays: 'THIRTY_DAYS',
      accountScope: 'LINKED',
      filter: null,
    });

  // declare a budget cap (member account can budget ITSELF — no mgmt wall)
  const budget = DeclaredAwsBudget.as({
    name: 'declastruct-acceptance-budget',
    kind: 'COST',
    limit: { amount: '100', unit: 'USD' },
    timeUnit: 'MONTHLY',
    costFilters: null,
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

  // declare a threshold alert tier that refs the budget (email subscriber)
  const budgetNotification = DeclaredAwsBudgetNotification.as({
    budget: RefByUnique.as<typeof DeclaredAwsBudget>(budget),
    basis: 'ACTUAL',
    comparison: 'GREATER_THAN',
    threshold: { quant: 80, unit: 'PERCENTAGE' },
    subscribers: [{ via: 'EMAIL', address: 'ops@ehmpath.com' }],
  });

  // declare a generic metric alarm (any account can alarm on its own metric)
  const metricAlarm = DeclaredAwsCloudwatchMetricAlarm.as({
    name: 'declastruct-acceptance-alarm',
    description: 'declastruct acceptance metric alarm',
    namespace: 'Declastruct/Acceptance',
    metricName: 'TestMetric',
    statistic: 'Maximum',
    dimensions: { Suite: 'acceptance' },
    period: 300,
    evaluationPeriods: 1,
    threshold: 1,
    comparisonOperator: 'GreaterThanThreshold',
    unit: null,
    alarmActions: [],
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

  // declare a cost anomaly monitor (Cost Explorer, member account can self-monitor)
  const anomalyMonitor = DeclaredAwsCostAnomalyMonitor.as({
    name: 'declastruct-acceptance-anomaly',
    kind: 'DIMENSIONAL',
    dimension: 'SERVICE',
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

  // declare an anomaly subscription atop the monitor (daily email digest;
  //   DAILY/WEEKLY deliver over email, so no SNS topic policy is needed)
  const anomalySubscription = DeclaredAwsCostAnomalySubscription.as({
    name: 'declastruct-acceptance-anomaly-sub',
    monitor: RefByUnique.as<typeof DeclaredAwsCostAnomalyMonitor>(anomalyMonitor),
    frequency: 'DAILY',
    threshold: { amount: '20', unit: 'USD' },
    subscribers: [{ via: 'EMAIL', address: 'ops@ehmpath.com' }],
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

  // declare the execution role AWS Budgets assumes to run + reverse the guard
  //   (trusted to budgets.amazonaws.com; the action refs it below)
  const budgetActionRole = DeclaredAwsIamRole.as({
    name: 'declastruct-acceptance-budgets-action-role',
    path: '/',
    description: 'role AWS Budgets assumes to run + reverse the acceptance guard',
    policies: [
      {
        effect: 'Allow',
        principal: { service: 'budgets.amazonaws.com' },
        action: 'sts:AssumeRole',
      },
    ],
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

  // declare a budget-action guard in the member-account-safe APPLY_IAM_POLICY form
  //   - the SCP form needs management-account access (same wall as SCPs); the SSM
  //     form needs a live instance id — neither is available in the test account
  //   - the IAM form attaches an AWS-managed policy (AWSDenyAll) to a role, which
  //     the member account CAN create for itself. the target is the execution role
  //     itself (a harmless self-freeze that never fires at the test threshold)
  const budgetActionGuard = DeclaredAwsBudgetAction.as({
    budget: RefByUnique.as<typeof DeclaredAwsBudget>(budget),
    kind: 'APPLY_IAM_POLICY',
    basis: 'ACTUAL',
    threshold: { quant: 110, unit: 'PERCENTAGE' },
    approvalModel: 'AUTOMATIC',
    executionRole: RefByUnique.as<typeof DeclaredAwsIamRole>(budgetActionRole),
    definition: {
      scp: null,
      ssm: null,
      iam: {
        policyArn: 'arn:aws:iam::aws:policy/AWSDenyAll',
        roleNames: [budgetActionRole.name],
        groupNames: [],
        userNames: [],
      },
    },
    subscribers: [{ via: 'EMAIL', address: 'ops@ehmpath.com' }],
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
    iamInstanceProfile: RefByUnique.as<typeof DeclaredAwsIamInstanceProfile>(
      ec2InstanceProfile,
    ),
    userData: null,
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

  // declare EC2 instance with acceptance VPC resources
  const ec2Instance = DeclaredAwsEc2Instance.as({
    exid: 'declastruct-acceptance-instance',
    template: RefByUnique.as<typeof DeclaredAwsEc2LaunchTemplate>(
      ec2LaunchTemplate,
    ),
    network: {
      subnet: { exid: subnetPrivate.exid },
      security: { groups: [{ exid: securityGroup.exid }] },
      interface: { publicIpEnabled: false, sourceDestChecked: true },
    },
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

  // declare EC2 instance session (stopped to avoid charges when idle)
  const ec2InstanceSession = DeclaredAwsEc2InstanceSession.as({
    instance: RefByUnique.as<typeof DeclaredAwsEc2Instance>(ec2Instance),
    status: 'stopped',
  });

  /**
   * .what = an SSH key authorization, driven via plan/apply through
   *   DeclaredAwsEc2SshKeyAuthorizedDao
   * .why = dogfoods the declarative flow for the ssh key resource, same as every
   *   other declared resource (see rule.require.dao-and-acceptance-per-declared-resource)
   *
   * .seed = REQUIRED once per instance, because the durable append runs over SSM and
   *   so needs a RUNNING instance, yet this fixture keeps the instance stopped for
   *   cost. so the acceptance test's beforeAll seeds it once (start -> authorize ->
   *   the fixture apply stops it again; the key stays on the EBS disk + is recorded in
   *   the SSM param track layer). thereafter the DAO.findsert finds the key in the
   *   param store and returns it without a re-append, so plan/apply converge to KEEP
   *   at zero cost.
   *
   * .reseed = if you CHANGE the instance (new exid, new launch template, teardown +
   *   recreate), the old param no longer matches the new instance. to re-seed:
   *     1. bump/confirm ACCEPTANCE_SSH_PUBLIC_KEY below (any valid ed25519 pubkey;
   *        generate one with `ssh-keygen -t ed25519 -f /tmp/k -N '' && cat /tmp/k.pub`)
   *     2. delete the stale param if the comment/exid changed:
   *        `aws ssm delete-parameter --name /declastruct/ec2/ssh-keys/<exid>/<comment>`
   *     3. run the acceptance suite once — its beforeAll starts the instance, appends
   *        the key over SSM, and records it; the fixture then stops the box
   *     4. subsequent runs find the param and show KEEP (no instance start, no cost)
   *   the very first run on a brand-new account may fail (instance absent + key absent);
   *   re-run once the instance exists and the beforeAll seeds it.
   */
  const ec2SshKeyAuthorized = DeclaredAwsEc2SshKeyAuthorized.as({
    instance: RefByUnique.as<typeof DeclaredAwsEc2Instance>(ec2Instance),
    publicKey: ACCEPTANCE_SSH_PUBLIC_KEY,
    comment: 'declastruct-acceptance-seed',
    user: 'ec2-user',
  });

  // declare SSM SSH tunnel (CLOSED status = no subprocess, safe for acceptance)
  // note: driven via plan/apply through DeclaredAwsSsmSshTunnelDao — a CLOSED
  //   tunnel has no cache file, so get -> CLOSED, apply -> no-op, idempotent
  const ssmSshTunnel = DeclaredAwsSsmSshTunnel.as({
    instance: RefByUnique.as<typeof DeclaredAwsEc2Instance>(ec2Instance),
    from: { port: 35432 },
    into: { port: 22 },
    status: 'CLOSED',
  });

  // declare a plaintext SSM parameter (String) — value is non-secret, so drift is
  //   detected by a normal value-compare (GetParameter, no decrypt). value present ->
  //   apply creates it; re-plan compares 'info' === 'info' -> KEEP
  const ssmParameterPlain = DeclaredAwsSsmParameterPlain.as({
    name: '/declastruct-acceptance/plain/log-level',
    value: 'info',
    description: 'declastruct acceptance log level',
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
  });

  /**
   * .what = a secret SSM parameter (SecureString), driven via plan/apply through
   *   DeclaredAwsSsmParameterSecureDao
   * .why = dogfoods the write-only declarative flow, and proves the security guarantee:
   *   plan reconciles via metadata only (no GetParameter, no kms:Decrypt)
   *
   * .writeonly = the value is declared undefined for steady-state KEEP (replicates
   *   DeclaredGithubOrgSecret). a hard-coded value would show UPDATE on every plan
   *   (desired present vs remote undefined), so we source no value here.
   *
   * .seed = REQUIRED once, because a create needs a value but this fixture declares
   *   none. the acceptance beforeAll seeds it via setSsmParameterSecure with a value;
   *   thereafter the fixture (value undefined + secret present) converges to KEEP with
   *   no read. keyId null = account default aws/ssm key (the cast maps the default key
   *   alias back to null so a declared null converges to KEEP)
   */
  const ssmParameterSecure = DeclaredAwsSsmParameterSecure.as({
    name: '/declastruct-acceptance/secure/api-token',
    value: undefined,
    keyId: null,
    description: 'declastruct acceptance secret',
    tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
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
    subnetPublic,
    subnetPrivate,
    securityGroup,
    internetGateway,
    routeTablePublic,
    // tunnel,
    lambdaRole,
    lambdaRolePolicy,
    lambda,
    lambdaVersion,
    lambdaAlias,
    logGroupWithRetention,
    logGroupReportDistOfPattern,
    logGroupReportCostOfIngestion,
    // cost explorer reports (read-only composites) — declared UNCONDITIONALLY: each
    // `plan` issues a live cost-explorer read (~$0.01/report), an accepted per-run CI
    // cost (the wisher opted into it) so the reports are first-class declared resources
    // with committed masked snapshots, not dormant-by-default. the local per-user cache
    // (getCostReportCache) collapses repeat LOCAL reads within its ttl; CI is a cold
    // cache and re-bills per run — accepted. the KEEP + masked-shape test blocks assert
    // these same resources, so declaration and assertions stay in lockstep
    costReportSpendObserved,
    costReportSpendObservedByResource,
    costReportSpendForecast,
    costReportRecommendationsToRightsize,
    costReportRecommendationsToPurchasePlan,
    // ec2 iam infrastructure (enables SSM connectivity)
    ec2Role,
    ec2RoleSsmPolicy,
    ec2InstanceProfile,
    // nat instance (egress for the private subnet) — must precede the private
    // route table, whose 0.0.0.0/0 route targets it by ref
    // note: no session — the NAT self-stops when idle; tests start it on demand
    natLaunchTemplate,
    natInstance,
    routeTablePrivate,
    // ec2 infrastructure
    ec2LaunchTemplate,
    ec2Instance,
    ec2InstanceSession,
    // ssm ssh tunnel (CLOSED — driven via plan/apply, no live subprocess)
    ssmSshTunnel,
    // ssm parameters — plaintext (value-compare) + secret (write-only, seeded in beforeAll)
    ssmParameterPlain,
    ssmParameterSecure,
    // ssh key authorization (seeded once via the acceptance beforeAll; see its .seed note)
    ec2SshKeyAuthorized,
    // budget cap + its threshold alert tier (budget declared before the tier refs it)
    budget,
    budgetNotification,
    // generic cloudwatch metric alarm
    metricAlarm,
    // cost anomaly monitor + its alert subscription (monitor before the sub refs it)
    anomalyMonitor,
    anomalySubscription,
    // budget-action guard (member-account-safe APPLY_IAM_POLICY form) + its
    //   execution role (role before the action refs it; budget already above)
    budgetActionRole,
    budgetActionGuard,
    ...accessKeysToDelete,
  ];
};
