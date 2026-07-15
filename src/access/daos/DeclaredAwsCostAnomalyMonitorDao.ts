import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsCostAnomalyMonitor } from '@src/domain.objects/DeclaredAwsCostAnomalyMonitor';
import { delCostAnomalyMonitor } from '@src/domain.operations/costAnomalyMonitor/delCostAnomalyMonitor';
import { getOneCostAnomalyMonitor } from '@src/domain.operations/costAnomalyMonitor/getOneCostAnomalyMonitor';
import { setCostAnomalyMonitor } from '@src/domain.operations/costAnomalyMonitor/setCostAnomalyMonitor';

/**
 * .what = declastruct DAO for AWS Cost Anomaly Monitor resources
 * .why = wraps monitor operations to conform to the declastruct interface
 * .note
 *   - identified by name (unique), no primary key — the MonitorArn is @metadata
 *   - findsert = create if absent, return extant (idempotent)
 *   - upsert = create or update name/tags
 *   - delete = remove the monitor (also removes any alert subscription)
 */
export const DeclaredAwsCostAnomalyMonitorDao = genDeclastructDao<
  typeof DeclaredAwsCostAnomalyMonitor,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsCostAnomalyMonitor,
  get: {
    one: {
      byPrimary: null, // no primary key — addressed by name
      byUnique: async (input, context) => {
        return getOneCostAnomalyMonitor({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setCostAnomalyMonitor({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setCostAnomalyMonitor({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delCostAnomalyMonitor({ by: { ref: input } }, context);
    },
  },
});
