import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsCostAnomalySubscription } from '@src/domain.objects/DeclaredAwsCostAnomalySubscription';
import { delCostAnomalySubscription } from '@src/domain.operations/costAnomalySubscription/delCostAnomalySubscription';
import { getOneCostAnomalySubscription } from '@src/domain.operations/costAnomalySubscription/getOneCostAnomalySubscription';
import { setCostAnomalySubscription } from '@src/domain.operations/costAnomalySubscription/setCostAnomalySubscription';

/**
 * .what = declastruct DAO for AWS Cost Anomaly Subscription resources
 * .why = wraps subscription operations to conform to the declastruct interface
 * .note
 *   - identified by name (unique); arn is metadata assigned by AWS
 *   - findsert = create if absent, return extant (idempotent)
 *   - upsert = create or update frequency/threshold/subscribers
 *   - delete = remove the subscription (tear it down before its monitor)
 */
export const DeclaredAwsCostAnomalySubscriptionDao = genDeclastructDao<
  typeof DeclaredAwsCostAnomalySubscription,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsCostAnomalySubscription,
  get: {
    one: {
      byPrimary: null, // no primary key — addressed by name
      byUnique: async (input, context) => {
        return getOneCostAnomalySubscription(
          { by: { unique: input } },
          context,
        );
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setCostAnomalySubscription({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setCostAnomalySubscription({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delCostAnomalySubscription({ by: { ref: input } }, context);
    },
  },
});
