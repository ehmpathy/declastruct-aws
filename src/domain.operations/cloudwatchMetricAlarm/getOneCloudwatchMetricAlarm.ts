import {
  CloudWatchClient,
  DescribeAlarmsCommand,
  ListTagsForResourceCommand,
} from '@aws-sdk/client-cloudwatch';
import { asProcedure } from 'as-procedure';
import {
  type HasReadonly,
  isRefByUnique,
  type Ref,
  type RefByUnique,
} from 'domain-objects';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsCloudwatchMetricAlarm } from '@src/domain.objects/DeclaredAwsCloudwatchMetricAlarm';

import { castIntoDeclaredAwsCloudwatchMetricAlarm } from './castIntoDeclaredAwsCloudwatchMetricAlarm';

/**
 * .what = retrieves a metric alarm by unique (name) or ref
 * .why = enables lookup for idempotent findsert/upsert and drift detection
 * .note
 *   - a metric alarm has no artificial primary key; it is addressed by name
 *     within the region
 *   - returns null if the alarm is absent
 */
export const getOneCloudwatchMetricAlarm = asProcedure(
  async (
    input: {
      by: PickOne<{
        unique: RefByUnique<typeof DeclaredAwsCloudwatchMetricAlarm>;
        ref: Ref<typeof DeclaredAwsCloudwatchMetricAlarm>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsCloudwatchMetricAlarm> | null> => {
    // handle by ref via a type guard
    if (input.by.ref) {
      if (isRefByUnique({ of: DeclaredAwsCloudwatchMetricAlarm })(input.by.ref))
        return getOneCloudwatchMetricAlarm(
          { by: { unique: input.by.ref } },
          context,
        );
      UnexpectedCodePathError.throw('alarm ref is not a unique ref', { input });
    }

    // determine the alarm name
    const alarmName = input.by.unique
      ? input.by.unique.name
      : UnexpectedCodePathError.throw('not referenced by unique. how not?', {
          input,
        });

    // declare the client (regional — alarms live in the context region)
    const client = new CloudWatchClient({
      region: context.aws.credentials.region,
    });

    try {
      // describe the alarm by exact name
      const response = await client.send(
        new DescribeAlarmsCommand({
          AlarmNames: [alarmName],
          AlarmTypes: ['MetricAlarm'],
        }),
      );

      const alarm = response.MetricAlarms?.[0];
      if (!alarm || !alarm.AlarmArn) return null;

      // fetch tags via the alarm ARN
      const tagsResponse = await client.send(
        new ListTagsForResourceCommand({ ResourceARN: alarm.AlarmArn }),
      );

      return castIntoDeclaredAwsCloudwatchMetricAlarm({
        alarm,
        tags: tagsResponse.Tags,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      throw new HelpfulError('aws.getOneCloudwatchMetricAlarm error', {
        cause: error,
        context: {
          errorName: error.name,
          errorMessage: error.message,
          input,
        },
      });
    }
  },
);
