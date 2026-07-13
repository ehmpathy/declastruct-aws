import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsCloudwatchMetricAlarm } from '@src/domain.objects/DeclaredAwsCloudwatchMetricAlarm';
import { delCloudwatchMetricAlarm } from '@src/domain.operations/cloudwatchMetricAlarm/delCloudwatchMetricAlarm';
import { getOneCloudwatchMetricAlarm } from '@src/domain.operations/cloudwatchMetricAlarm/getOneCloudwatchMetricAlarm';
import { setCloudwatchMetricAlarm } from '@src/domain.operations/cloudwatchMetricAlarm/setCloudwatchMetricAlarm';

/**
 * .what = declastruct DAO for AWS CloudWatch metric alarm resources
 * .why = wraps alarm operations to conform to the declastruct interface
 * .note
 *   - identified by name (unique), no primary key — arn is metadata
 *   - findsert = create if absent, return extant (idempotent)
 *   - upsert = create or overwrite the alarm config + tags
 *   - delete = remove the alarm
 */
export const DeclaredAwsCloudwatchMetricAlarmDao = genDeclastructDao<
  typeof DeclaredAwsCloudwatchMetricAlarm,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsCloudwatchMetricAlarm,
  get: {
    one: {
      byPrimary: null, // no primary key — addressed by name
      byUnique: async (input, context) => {
        return getOneCloudwatchMetricAlarm({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setCloudwatchMetricAlarm({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setCloudwatchMetricAlarm({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delCloudwatchMetricAlarm({ by: { ref: input } }, context);
    },
  },
});
