import { CostExplorerClient } from '@aws-sdk/client-cost-explorer';

import { getCostManagementGuidanceError } from './getCostManagementGuidanceError';

/**
 * .what = the region the AWS Cost Explorer service is pinned to
 * .why = Cost Explorer (which backs Cost Anomaly Detection) is a global service;
 *        its API endpoint lives ONLY in us-east-1, regardless of
 *        context.aws.credentials.region. this is a deliberate deviation from the
 *        "region from context" pattern used by other clients — a Cost Explorer
 *        client built for any other region silently fails to reach the service.
 * @see https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_Operations_AWS_Cost_Explorer_Service.html
 */
export const AWS_COST_EXPLORER_REGION = 'us-east-1' as const;

/**
 * .what = creates a CostExplorerClient pinned to us-east-1
 * .why = Cost Explorer is a global service reachable only via the us-east-1
 *        endpoint, so this factory hardcodes the region rather than read it from
 *        context
 * .note = credentials load from the default provider chain, same as peer clients
 */
export const getAwsCostExplorerClient = (): CostExplorerClient => {
  const client = new CostExplorerClient({ region: AWS_COST_EXPLORER_REGION });

  // guide the human when Cost Explorer is off: translate the aws "please enable"
  // error into actionable guidance (allowlisted translate-then-rethrow — not a
  // failhide, per rule.prefer.helpful-error-wrap). covers every read + write here
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
