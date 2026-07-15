import {
  CloudWatchClient,
  DeleteAlarmsCommand,
} from '@aws-sdk/client-cloudwatch';
import { asProcedure } from 'as-procedure';
import { isRefByUnique, type Ref, type RefByUnique } from 'domain-objects';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsCloudwatchMetricAlarm } from '@src/domain.objects/DeclaredAwsCloudwatchMetricAlarm';

/**
 * .what = deletes a metric alarm by unique (name) or ref
 * .why = enables declarative teardown; idempotent — DeleteAlarms is a no-op for
 *        names that are already absent
 */
export const delCloudwatchMetricAlarm = asProcedure(
  async (
    input: {
      by: PickOne<{
        unique: RefByUnique<typeof DeclaredAwsCloudwatchMetricAlarm>;
        ref: Ref<typeof DeclaredAwsCloudwatchMetricAlarm>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<void> => {
    // handle by ref via a type guard
    if (input.by.ref) {
      if (isRefByUnique({ of: DeclaredAwsCloudwatchMetricAlarm })(input.by.ref))
        return delCloudwatchMetricAlarm(
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

    // declare the client (regional)
    const client = new CloudWatchClient({
      region: context.aws.credentials.region,
    });

    try {
      await client.send(new DeleteAlarmsCommand({ AlarmNames: [alarmName] }));
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // idempotent: already absent
      if (error.name === 'ResourceNotFound') return;

      throw new HelpfulError('aws.delCloudwatchMetricAlarm error', {
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
