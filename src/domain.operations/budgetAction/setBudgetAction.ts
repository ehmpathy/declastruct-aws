import {
  type ActionThreshold,
  CreateBudgetActionCommand,
  type Definition,
  type Subscriber,
  UpdateBudgetActionCommand,
} from '@aws-sdk/client-budgets';
import { sleep } from '@ehmpathy/uni-time';
import { asProcedure } from 'as-procedure';
import {
  type HasReadonly,
  isRefByPrimary,
  type Ref,
  RefByUnique,
} from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import { getAwsBudgetsClient } from '@src/access/sdks/getAwsBudgetsClient';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsBudgetAction } from '@src/domain.objects/DeclaredAwsBudgetAction';
import type { DeclaredAwsBudgetSubscriber } from '@src/domain.objects/DeclaredAwsBudgetSubscriber';
import { DeclaredAwsIamRole } from '@src/domain.objects/DeclaredAwsIamRole';
import { DeclaredAwsOrganizationServiceControlPolicy } from '@src/domain.objects/DeclaredAwsOrganizationServiceControlPolicy';
import { getIamRole } from '@src/domain.operations/iamRole/getIamRole';
import { getRefByPrimaryOfOrganizationAccount } from '@src/domain.operations/organizationAccount/getRefByPrimaryOfOrganizationAccount';
import { getOneOrganizationServiceControlPolicy } from '@src/domain.operations/organizationServiceControlPolicy/getOneOrganizationServiceControlPolicy';

import { getOneBudgetAction } from './getOneBudgetAction';

/**
 * .what = builds the AWS Subscriber from our declared subscriber
 */
const asAwsSubscriber = (
  subscriber: DeclaredAwsBudgetSubscriber,
): Subscriber => ({
  SubscriptionType: subscriber.via,
  Address: subscriber.address,
});

/**
 * .what = builds the AWS ActionThreshold from our declared threshold
 */
const asAwsThreshold = (desired: DeclaredAwsBudgetAction): ActionThreshold => ({
  ActionThresholdValue: desired.threshold.quant,
  ActionThresholdType: desired.threshold.unit,
});

/**
 * .what = derives the ExecutionRoleArn from the executionRole ref
 * .why = AWS assumes this role to run + reverse the action; a primary ref carries
 *        the arn directly, a unique ref needs a role lookup
 */
const getExecutionRoleArn = async (
  desired: DeclaredAwsBudgetAction,
  context: ContextAwsApi & VisualogicContext,
): Promise<string> => {
  // a primary ref already carries the arn
  if (isRefByPrimary({ of: DeclaredAwsIamRole })(desired.executionRole))
    return desired.executionRole.arn;

  // a unique ref needs a lookup to derive the arn
  const roleFound = await getIamRole(
    { by: { ref: desired.executionRole } },
    context,
  );
  if (!roleFound?.arn)
    BadRequestError.throw('executionRole not found; cannot derive its arn', {
      executionRole: desired.executionRole,
    });
  return roleFound.arn;
};

/**
 * .what = derives the ScpActionDefinition PolicyId from the policy ref
 * .why = AWS needs the PolicyId; a primary ref carries it, a unique ref needs a lookup
 */
const getScpPolicyId = async (
  policy: Ref<typeof DeclaredAwsOrganizationServiceControlPolicy>,
  context: ContextAwsApi & VisualogicContext,
): Promise<string> => {
  // a primary ref already carries the id
  if (
    isRefByPrimary({ of: DeclaredAwsOrganizationServiceControlPolicy })(policy)
  )
    return policy.id;

  // a unique ref needs a lookup to derive the id
  const policyFound = await getOneOrganizationServiceControlPolicy(
    { by: { ref: policy } },
    context,
  );
  if (!policyFound?.id)
    BadRequestError.throw('scp policy not found; cannot derive PolicyId', {
      policy,
    });
  return policyFound.id;
};

/**
 * .what = builds the AWS Definition union from our declared definition + kind
 * .why = AWS's Definition needs ids (PolicyId, TargetIds); we derive them from the
 *        refs in the declared definition at apply time
 */
const getAwsDefinition = async (
  desired: DeclaredAwsBudgetAction,
  context: ContextAwsApi & VisualogicContext,
): Promise<Definition> => {
  // the SCP form — derive PolicyId + TargetIds from the refs
  if (desired.kind === 'APPLY_SCP_POLICY') {
    const scp = desired.definition.scp;
    if (!scp)
      BadRequestError.throw('APPLY_SCP_POLICY action lacks a scp definition', {
        desired,
      });

    // derive the ids AWS needs from the refs
    const policyId = await getScpPolicyId(scp.policy, context);
    const targetRef = await getRefByPrimaryOfOrganizationAccount(
      { ref: scp.target },
      context,
    );

    return {
      ScpActionDefinition: { PolicyId: policyId, TargetIds: [targetRef.id] },
    };
  }

  // the SSM form — pass through kind, region, instanceIds
  if (desired.kind === 'RUN_SSM_DOCUMENTS') {
    const ssm = desired.definition.ssm;
    if (!ssm)
      BadRequestError.throw(
        'RUN_SSM_DOCUMENTS action lacks an ssm definition',
        {
          desired,
        },
      );
    return {
      SsmActionDefinition: {
        ActionSubType: ssm.kind,
        Region: ssm.region,
        InstanceIds: ssm.instanceIds,
      },
    };
  }

  // the IAM form — pass through policyArn + attach targets
  if (desired.kind === 'APPLY_IAM_POLICY') {
    const iam = desired.definition.iam;
    if (!iam)
      BadRequestError.throw('APPLY_IAM_POLICY action lacks an iam definition', {
        desired,
      });
    return {
      IamActionDefinition: {
        PolicyArn: iam.policyArn,
        Roles: iam.roleNames.length ? iam.roleNames : undefined,
        Groups: iam.groupNames.length ? iam.groupNames : undefined,
        Users: iam.userNames.length ? iam.userNames : undefined,
      },
    };
  }

  return UnexpectedCodePathError.throw('unsupported kind', { desired });
};

/**
 * .what = creates a budget action, or updates it in place, idempotently
 * .why = enables declarative plan/apply with a cheap re-apply
 * .note
 *   - findsert: returns the extant action if one of this kind is on the budget (no change)
 *   - upsert: ensures the action exists AND overwrites its threshold, definition,
 *     approvalModel, basis, and subscribers
 *   - the BUDGET and the executionRole must exist first
 */
export const setBudgetAction = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsBudgetAction;
      upsert: DeclaredAwsBudgetAction;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsBudgetAction>> => {
    const desired = input.findsert ?? input.upsert;
    const isUpsert = !!input.upsert;

    // failfast if no input
    if (!desired) BadRequestError.throw('findsert or upsert is required');

    // declare the client (pinned to us-east-1)
    const client = getAwsBudgetsClient();
    const accountId = context.aws.credentials.account;
    const budgetName = desired.budget.name;

    // the unique ref used to re-read the action after a write
    const uniqueRef = RefByUnique.as<typeof DeclaredAwsBudgetAction>({
      budget: desired.budget,
      kind: desired.kind,
    });

    // check if an action of this kind already exists on the budget
    const foundBefore = await getOneBudgetAction(
      { by: { unique: uniqueRef } },
      context,
    );

    // findsert: return the extant action without change
    if (foundBefore && !isUpsert) return foundBefore;

    // derive the AWS-shaped inputs (arn, definition) from the refs
    const executionRoleArn = await getExecutionRoleArn(desired, context);
    const definition = await getAwsDefinition(desired, context);
    const subscribers = desired.subscribers.map(asAwsSubscriber);

    // create the action when absent
    if (!foundBefore) {
      await createWithRoleAssumeRetry({
        client,
        command: new CreateBudgetActionCommand({
          AccountId: accountId,
          BudgetName: budgetName,
          NotificationType: desired.basis,
          ActionType: desired.kind,
          ActionThreshold: asAwsThreshold(desired),
          Definition: definition,
          ExecutionRoleArn: executionRoleArn,
          ApprovalModel: desired.approvalModel,
          Subscribers: subscribers,
        }),
      });
      return getOneAfter({ context, uniqueRef });
    }

    // upsert on an extant action: overwrite its mutable fields in place
    await client.send(
      new UpdateBudgetActionCommand({
        AccountId: accountId,
        BudgetName: budgetName,
        ActionId:
          foundBefore.actionId ??
          UnexpectedCodePathError.throw('extant action lacks an actionId', {
            foundBefore,
          }),
        NotificationType: desired.basis,
        ActionThreshold: asAwsThreshold(desired),
        Definition: definition,
        ExecutionRoleArn: executionRoleArn,
        ApprovalModel: desired.approvalModel,
        Subscribers: subscribers,
      }),
    );
    return getOneAfter({ context, uniqueRef });
  },
);

/**
 * .what = sends CreateBudgetAction, with a bounded retry for the IAM-propagation race
 * .why = AWS Budgets assumes the ExecutionRole synchronously as it creates the action.
 *        when the role + the action are declared in one apply (as the reference posture
 *        does), the role's trust policy may not have propagated yet, so Budgets fails
 *        with "Budgets permission required to assume [ExecutionRole ...]". this is a
 *        known eventually-consistent IAM race — a bounded retry-with-backoff lets the
 *        trust propagate, then the create succeeds. any other error rethrows at once
 * .note = allowlisted retry on ONE transient signal, not a blanket catch (not a
 *         failhide, per rule.forbid.failhide)
 */
const createWithRoleAssumeRetry = async (input: {
  client: ReturnType<typeof getAwsBudgetsClient>;
  command: CreateBudgetActionCommand;
}): Promise<void> => {
  const { client, command } = input;
  const maxAttempts = 12; // ~12 * 5s = up to 60s for the trust policy to propagate
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await client.send(command);
      return;
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // only retry the transient "cannot assume the just-created ExecutionRole" race
      const isRoleAssumePropagation =
        error.name === 'AccessDeniedException' &&
        error.message.includes('assume') &&
        error.message.includes('ExecutionRole');
      if (!isRoleAssumePropagation) throw error;

      // give up after the budget of attempts; surface the last error
      if (attempt === maxAttempts) throw error;

      // wait for the role trust to propagate, then retry
      await sleep(5_000);
    }
  }
};

/**
 * .what = re-reads the action after a write and failfasts if absent
 */
const getOneAfter = async (input: {
  context: ContextAwsApi & VisualogicContext;
  uniqueRef: RefByUnique<typeof DeclaredAwsBudgetAction>;
}): Promise<HasReadonly<typeof DeclaredAwsBudgetAction>> => {
  const foundAfter = await getOneBudgetAction(
    { by: { unique: input.uniqueRef } },
    input.context,
  );
  if (!foundAfter)
    UnexpectedCodePathError.throw('action not found after set', {
      uniqueRef: input.uniqueRef,
    });
  return foundAfter;
};
