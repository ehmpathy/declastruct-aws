import type { Action } from '@aws-sdk/client-budgets';
import {
  type HasReadonly,
  hasReadonly,
  RefByPrimary,
  RefByUnique,
} from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import type { DeclaredAwsBudget } from '@src/domain.objects/DeclaredAwsBudget';
import { DeclaredAwsBudgetAction } from '@src/domain.objects/DeclaredAwsBudgetAction';
import { DeclaredAwsBudgetActionDefinition } from '@src/domain.objects/DeclaredAwsBudgetActionDefinition';
import { DeclaredAwsBudgetActionIam } from '@src/domain.objects/DeclaredAwsBudgetActionIam';
import { DeclaredAwsBudgetActionScp } from '@src/domain.objects/DeclaredAwsBudgetActionScp';
import { DeclaredAwsBudgetActionSsm } from '@src/domain.objects/DeclaredAwsBudgetActionSsm';
import { DeclaredAwsBudgetSubscriber } from '@src/domain.objects/DeclaredAwsBudgetSubscriber';
import { DeclaredAwsBudgetThreshold } from '@src/domain.objects/DeclaredAwsBudgetThreshold';
import type { DeclaredAwsIamRole } from '@src/domain.objects/DeclaredAwsIamRole';
import type { DeclaredAwsOrganizationAccount } from '@src/domain.objects/DeclaredAwsOrganizationAccount';
import type { DeclaredAwsOrganizationServiceControlPolicy } from '@src/domain.objects/DeclaredAwsOrganizationServiceControlPolicy';

/**
 * .what = decodes the AWS `Definition` union into our declared definition shape
 * .why = AWS gives ids (PolicyId, TargetIds, ExecutionRoleArn); we express those as
 *        primary refs on the round trip so the found shape stays faithful to AWS
 * .note
 *   - a get can only return ids, so refs come back by primary (not by the unique
 *     name/email a user may have declared) — a known ref-shape asymmetry
 */
const castIntoDefinition = (
  action: Action,
): DeclaredAwsBudgetActionDefinition => {
  // the SCP form — attach a deny-SCP to a target account
  if (action.ActionType === 'APPLY_SCP_POLICY') {
    const scp = action.Definition?.ScpActionDefinition;
    if (!scp)
      UnexpectedCodePathError.throw('scp action lacks ScpActionDefinition', {
        action,
      });
    const firstTarget =
      scp.TargetIds?.[0] ??
      UnexpectedCodePathError.throw('scp action lacks a TargetId', { action });
    return new DeclaredAwsBudgetActionDefinition({
      scp: new DeclaredAwsBudgetActionScp({
        policy: RefByPrimary.as<
          typeof DeclaredAwsOrganizationServiceControlPolicy
        >({
          id:
            scp.PolicyId ??
            UnexpectedCodePathError.throw('scp action lacks a PolicyId', {
              action,
            }),
        }),
        target: RefByPrimary.as<typeof DeclaredAwsOrganizationAccount>({
          id: firstTarget,
        }),
      }),
      ssm: null,
      iam: null,
    });
  }

  // the SSM form — run a doc that stops live instances
  if (action.ActionType === 'RUN_SSM_DOCUMENTS') {
    const ssm = action.Definition?.SsmActionDefinition;
    if (!ssm)
      UnexpectedCodePathError.throw('ssm action lacks SsmActionDefinition', {
        action,
      });
    const kind = ssm.ActionSubType;
    if (kind !== 'STOP_EC2_INSTANCES' && kind !== 'STOP_RDS_INSTANCES')
      UnexpectedCodePathError.throw('ssm action has an unsupported kind', {
        action,
      });
    return new DeclaredAwsBudgetActionDefinition({
      scp: null,
      ssm: new DeclaredAwsBudgetActionSsm({
        kind,
        region:
          ssm.Region ??
          UnexpectedCodePathError.throw('ssm action lacks a Region', {
            action,
          }),
        instanceIds: ssm.InstanceIds ?? [],
      }),
      iam: null,
    });
  }

  // the IAM form — attach an IAM policy
  if (action.ActionType === 'APPLY_IAM_POLICY') {
    const iam = action.Definition?.IamActionDefinition;
    if (!iam)
      UnexpectedCodePathError.throw('iam action lacks IamActionDefinition', {
        action,
      });
    return new DeclaredAwsBudgetActionDefinition({
      scp: null,
      ssm: null,
      iam: new DeclaredAwsBudgetActionIam({
        policyArn:
          iam.PolicyArn ??
          UnexpectedCodePathError.throw('iam action lacks a PolicyArn', {
            action,
          }),
        roleNames: iam.Roles ?? [],
        groupNames: iam.Groups ?? [],
        userNames: iam.Users ?? [],
      }),
    });
  }

  return UnexpectedCodePathError.throw('action has an unsupported ActionType', {
    action,
  });
};

/**
 * .what = maps an AWS budget `Action` into a DeclaredAwsBudgetAction
 * .why = the AWS shape (ActionType, ActionThreshold, Definition, ...) differs from
 *        our declared shape; this cast is the single decode point
 * .note
 *   - budget comes back by unique (name), from Action.BudgetName
 *   - executionRole + definition ids come back by primary (see castIntoDefinition)
 */
export const castIntoDeclaredAwsBudgetAction = (input: {
  action: Action;
}): HasReadonly<typeof DeclaredAwsBudgetAction> => {
  const { action } = input;

  // the budget the guard belongs to
  const budgetName =
    action.BudgetName ??
    UnexpectedCodePathError.throw('action lacks a BudgetName', { action });
  const budget = RefByUnique.as<typeof DeclaredAwsBudget>({ name: budgetName });

  // whether the guard watches actual or forecasted spend
  const basis = action.NotificationType;
  if (basis !== 'ACTUAL' && basis !== 'FORECASTED')
    UnexpectedCodePathError.throw(
      'action has an unsupported NotificationType',
      {
        action,
      },
    );

  // the kind of action AWS runs
  const kind = action.ActionType;
  if (
    kind !== 'APPLY_IAM_POLICY' &&
    kind !== 'APPLY_SCP_POLICY' &&
    kind !== 'RUN_SSM_DOCUMENTS'
  )
    UnexpectedCodePathError.throw('action has an unsupported ActionType', {
      action,
    });

  // whether AWS runs hands-off or awaits approval
  const approvalModel = action.ApprovalModel;
  if (approvalModel !== 'AUTOMATIC' && approvalModel !== 'MANUAL')
    UnexpectedCodePathError.throw('action has an unsupported ApprovalModel', {
      action,
    });

  // the trigger threshold
  const thresholdType = action.ActionThreshold?.ActionThresholdType;
  if (thresholdType !== 'PERCENTAGE' && thresholdType !== 'ABSOLUTE_VALUE')
    UnexpectedCodePathError.throw('action has an unsupported ThresholdType', {
      action,
    });
  const threshold = new DeclaredAwsBudgetThreshold({
    quant:
      action.ActionThreshold?.ActionThresholdValue ??
      UnexpectedCodePathError.throw('action lacks a threshold value', {
        action,
      }),
    unit: thresholdType,
  });

  // the role AWS assumes to run + reverse the action
  const executionRole = RefByPrimary.as<typeof DeclaredAwsIamRole>({
    arn:
      action.ExecutionRoleArn ??
      UnexpectedCodePathError.throw('action lacks an ExecutionRoleArn', {
        action,
      }),
  });

  // decode each subscriber's channel + address
  const subscribers = (action.Subscribers ?? []).map((subscriber) => {
    const via = subscriber.SubscriptionType;
    if (via !== 'EMAIL' && via !== 'SNS')
      UnexpectedCodePathError.throw('subscriber has an unsupported channel', {
        subscriber,
      });
    return new DeclaredAwsBudgetSubscriber({
      via,
      address:
        subscriber.Address ??
        UnexpectedCodePathError.throw('subscriber lacks an Address', {
          subscriber,
        }),
    });
  });

  return assure(
    new DeclaredAwsBudgetAction({
      actionId:
        action.ActionId ??
        UnexpectedCodePathError.throw('action lacks an ActionId', { action }),
      budget,
      kind,
      basis,
      threshold,
      approvalModel,
      executionRole,
      definition: castIntoDefinition(action),
      subscribers,
    }),
    hasReadonly({ of: DeclaredAwsBudgetAction }),
  );
};
