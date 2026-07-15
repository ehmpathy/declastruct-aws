import { type DomainEntity, RefByUnique } from 'domain-objects';

import {
  DeclaredAwsBudget,
  DeclaredAwsBudgetAction,
  DeclaredAwsBudgetNotification,
  DeclaredAwsCloudwatchMetricAlarm,
  DeclaredAwsCostAnomalyMonitor,
  DeclaredAwsCostAnomalySubscription,
  DeclaredAwsIamPolicyDocument,
  DeclaredAwsIamRole,
  DeclaredAwsOrganizationServiceControlPolicy,
} from '../../../src/contract/sdks';

/**
 * .what = the demo account's budget posture — the R1 reference usecase, dogfooded
 * .why = bounds the demo account to a hard $21/mo cap with tiered alerts + anomaly
 *        detection, and (via the guards below) a self-enforcing spend halt. this is
 *        the copy-pasteable example a consumer adapts for their own account.
 *
 * .note
 *   - the alert recipient is a single email; swap for your own ops inbox / SNS topic
 *   - Budgets + Cost Explorer are pinned to us-east-1 by their sdk clients
 *   - the CAP + alerts + anomaly + alarm apply from the member account itself; the
 *     GUARDS need extra reach (see getResourcesOfBudgetGuards below)
 */

/**
 * .what = the ops recipient for every budget/anomaly alert in the demo posture
 */
const OPS_EMAIL = 'seaturtle@ehmpath.com';

/**
 * .what = the member-account-safe budget posture: the $21 cap, its tiered alerts,
 *         an anomaly monitor + subscription, and an estimated-charges style alarm
 * .why = this is what the demo account applies for itself — no management account,
 *        no execution role. it is the dogfood that proves the plan/apply path AND
 *        bounds our own demo account's spend.
 */
export const getResourcesOfBudget = (): DomainEntity<any>[] => {
  // the hard cap — the demo account must not spend more than $21/mo
  const budget = DeclaredAwsBudget.as({
    name: 'declastruct-demo-monthly',
    kind: 'COST',
    limit: { amount: '21', unit: 'USD' },
    timeUnit: 'MONTHLY',
    costFilters: null,
    tags: { managedBy: 'declastruct', purpose: 'demo-guardrail' },
  });

  // a shared ref to the budget for each tier + guard that points at it
  const budgetRef = RefByUnique.as<typeof DeclaredAwsBudget>(budget);

  // tiered threshold alerts at 50% / 80% (actual) and 100% (forecasted)
  const alert50 = DeclaredAwsBudgetNotification.as({
    budget: budgetRef,
    basis: 'ACTUAL',
    comparison: 'GREATER_THAN',
    threshold: { quant: 50, unit: 'PERCENTAGE' },
    subscribers: [{ via: 'EMAIL', address: OPS_EMAIL }],
  });
  const alert80 = DeclaredAwsBudgetNotification.as({
    budget: budgetRef,
    basis: 'ACTUAL',
    comparison: 'GREATER_THAN',
    threshold: { quant: 80, unit: 'PERCENTAGE' },
    subscribers: [{ via: 'EMAIL', address: OPS_EMAIL }],
  });
  const alert100 = DeclaredAwsBudgetNotification.as({
    budget: budgetRef,
    basis: 'FORECASTED',
    comparison: 'GREATER_THAN',
    threshold: { quant: 100, unit: 'PERCENTAGE' },
    subscribers: [{ via: 'EMAIL', address: OPS_EMAIL }],
  });

  // an ML anomaly monitor over spend by service, plus its daily email digest
  const anomalyMonitor = DeclaredAwsCostAnomalyMonitor.as({
    name: 'declastruct-demo-anomaly',
    kind: 'DIMENSIONAL',
    dimension: 'SERVICE',
    tags: { managedBy: 'declastruct', purpose: 'demo-guardrail' },
  });
  const anomalySubscription = DeclaredAwsCostAnomalySubscription.as({
    name: 'declastruct-demo-anomaly-sub',
    monitor:
      RefByUnique.as<typeof DeclaredAwsCostAnomalyMonitor>(anomalyMonitor),
    frequency: 'DAILY',
    threshold: { amount: '10', unit: 'USD' },
    subscribers: [{ via: 'EMAIL', address: OPS_EMAIL }],
    tags: { managedBy: 'declastruct', purpose: 'demo-guardrail' },
  });

  // an estimated-charges cost alarm (the generic metric alarm, configured for the
  // EstimatedCharges metric that lives only in us-east-1 with Currency=USD)
  const estimatedChargesAlarm = DeclaredAwsCloudwatchMetricAlarm.as({
    name: 'declastruct-demo-estimated-charges',
    description: 'alarm when the demo account estimated charges pass $21',
    namespace: 'AWS/Billing',
    metricName: 'EstimatedCharges',
    statistic: 'Maximum',
    dimensions: { Currency: 'USD' },
    period: 21600, // 6h — the EstimatedCharges metric updates ~every 6 hours
    evaluationPeriods: 1,
    threshold: 21,
    comparisonOperator: 'GreaterThanThreshold',
    unit: null,
    alarmActions: [],
    tags: { managedBy: 'declastruct', purpose: 'demo-guardrail' },
  });

  return [
    budget, // the cap first — every tier + guard refs it
    alert50,
    alert80,
    alert100,
    anomalyMonitor, // the monitor before the subscription refs it
    anomalySubscription,
    estimatedChargesAlarm,
  ];
};

/**
 * .what = the budget GUARDS — the execution role, a block-new SCP guard, and a
 *         kill-active SSM guard. the full "stop use" reference posture.
 * .why = R1 ships these as the copy-pasteable guard example. they are NOT wired
 *        into the default demo apply because they need reach the member account
 *        lacks:
 *          - budgets assumes the executionRole to run + reverse an action, and the
 *            demo OIDC role needs budgets:CreateBudgetAction + iam:PassRole granted
 *            first (see howto.add-test-permissions)
 *          - the SCP form (block new) needs management-account access — the same
 *            wall SCPs hit today; the demo account is a member, not the payer
 *          - the SSM form (kill active) needs the aws-assigned ec2 instance id of
 *            the demo box (an exid is a declare-time tag, not the aws id)
 *        so arming these is wisher-gated: grant the perms + provision the role +
 *        derive the instance id, then wire getResourcesOfBudgetGuards() into the
 *        apply. see the vision's open questions on the acceptance/dogfood cred path.
 * .note = this export exists so the guard shape is dogfooded structurally (it type
 *         checks + plans) even before the perms land.
 */
export const getResourcesOfBudgetGuards = (): DomainEntity<any>[] => {
  const budgetRef = RefByUnique.as<typeof DeclaredAwsBudget>({
    name: 'declastruct-demo-monthly',
  });

  // the role budgets assumes to run + reverse the guard actions
  const executionRole = DeclaredAwsIamRole.as({
    name: 'declastruct-budgets-action-role',
    path: '/',
    description:
      'role AWS Budgets assumes to run + reverse budget guard actions',
    policies: [
      {
        effect: 'Allow',
        principal: { service: 'budgets.amazonaws.com' },
        action: 'sts:AssumeRole',
      },
    ],
    tags: { managedBy: 'declastruct', purpose: 'demo-guardrail' },
  });

  // the deny-SCP the block-new guard attaches at 100% (blocks expensive launches)
  const denyExpensiveScp = DeclaredAwsOrganizationServiceControlPolicy.as({
    name: 'declastruct-demo-deny-expensive',
    description:
      'block launch of expensive resources when the budget is breached',
    content: new DeclaredAwsIamPolicyDocument({
      statements: [
        {
          sid: 'DenyExpensiveEc2',
          effect: 'Deny',
          action: ['ec2:RunInstances'],
          resource: 'arn:aws:ec2:*:*:instance/*',
          condition: {
            StringNotLike: {
              'ec2:InstanceType': ['t2.micro', 't3.micro'],
            },
          },
        },
      ],
    }),
    tags: null,
  });

  // guard A — block NEW spend: at 100% actual, attach the deny-SCP to the account
  const guardBlockNew = DeclaredAwsBudgetAction.as({
    budget: budgetRef,
    kind: 'APPLY_SCP_POLICY',
    basis: 'ACTUAL',
    threshold: { quant: 100, unit: 'PERCENTAGE' },
    approvalModel: 'AUTOMATIC',
    executionRole: RefByUnique.as<typeof DeclaredAwsIamRole>(executionRole),
    definition: {
      scp: {
        policy:
          RefByUnique.as<typeof DeclaredAwsOrganizationServiceControlPolicy>(
            denyExpensiveScp,
          ),
        target: { email: 'demo@ehmpath.com' },
      },
      ssm: null,
      iam: null,
    },
    subscribers: [{ via: 'EMAIL', address: OPS_EMAIL }],
  });

  // guard B — KILL active spend: at 110% actual, run an SSM doc that stops the box
  // note: instanceIds must be the aws-assigned id of declastruct-demo-box; fill it
  //       in once the box exists (a declare-time exid is not the aws id)
  const guardKillActive = DeclaredAwsBudgetAction.as({
    budget: budgetRef,
    kind: 'RUN_SSM_DOCUMENTS',
    basis: 'ACTUAL',
    threshold: { quant: 110, unit: 'PERCENTAGE' },
    approvalModel: 'AUTOMATIC',
    executionRole: RefByUnique.as<typeof DeclaredAwsIamRole>(executionRole),
    definition: {
      scp: null,
      ssm: {
        kind: 'STOP_EC2_INSTANCES',
        region: 'us-east-1',
        instanceIds: [], // fill with the aws-assigned demo-box id to arm (see .note)
      },
      iam: null,
    },
    subscribers: [{ via: 'EMAIL', address: OPS_EMAIL }],
  });

  return [
    executionRole, // the role first — both guards ref it
    denyExpensiveScp, // the SCP before the block-new guard refs it
    guardBlockNew,
    guardKillActive,
  ];
};
