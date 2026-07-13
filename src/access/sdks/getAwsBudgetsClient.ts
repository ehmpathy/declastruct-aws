import { BudgetsClient } from '@aws-sdk/client-budgets';

import { getCostManagementGuidanceError } from './getCostManagementGuidanceError';

/**
 * .what = the region the AWS Budgets service is pinned to
 * .why = Budgets is a global service; its API endpoint lives ONLY in us-east-1,
 *        regardless of context.aws.credentials.region. this is a deliberate
 *        deviation from the "region from context" pattern used by other clients
 *        (e.g. getAwsOrganizationsClient) — a Budgets client built for any other
 *        region silently fails to reach the service.
 * @see https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html
 */
export const AWS_BUDGETS_REGION = 'us-east-1' as const;

/**
 * .what = creates a BudgetsClient pinned to us-east-1
 * .why = Budgets is a global service reachable only via the us-east-1 endpoint,
 *        so this factory hardcodes the region rather than read it from context
 * .note = credentials load from the default provider chain, same as peer
 *         clients; the payer account id is read from context by callers
 *         (BudgetName + AccountId together identify a budget)
 */
export const getAwsBudgetsClient = (): BudgetsClient => {
  const client = new BudgetsClient({ region: AWS_BUDGETS_REGION });

  // guide the human when Budgets is off: translate the aws "please enable" error
  // into actionable guidance (allowlisted translate-then-rethrow — not a failhide,
  // per rule.prefer.helpful-error-wrap). covers every read + write via this client
  client.middlewareStack.add(
    (next) => async (args) => {
      try {
        return await next(args);
      } catch (error) {
        const guided = getCostManagementGuidanceError({ error });
        if (guided) throw guided;
        throw error;
      }
    },
    { step: 'initialize', name: 'costManagementEnablementGuidance' },
  );

  return client;
};
