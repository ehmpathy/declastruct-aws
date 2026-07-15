import {
  CloudWatchClient,
  PutMetricAlarmCommand,
  TagResourceCommand,
  UntagResourceCommand,
} from '@aws-sdk/client-cloudwatch';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsCloudwatchMetricAlarm } from '@src/domain.objects/DeclaredAwsCloudwatchMetricAlarm';
import { getAllTagKeysToRemove } from '@src/domain.operations/tags/getAllTagKeysToRemove';

import { getOneCloudwatchMetricAlarm } from './getOneCloudwatchMetricAlarm';

/**
 * .what = creates or updates a metric alarm idempotently
 * .why = enables declarative plan/apply with a cheap re-apply
 * .note
 *   - findsert: returns the extant alarm if the name exists (no overwrite)
 *   - upsert: PutMetricAlarm always overwrites the config; tags sync separately
 *     because PutMetricAlarm ignores Tags on an update
 */
export const setCloudwatchMetricAlarm = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsCloudwatchMetricAlarm;
      upsert: DeclaredAwsCloudwatchMetricAlarm;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsCloudwatchMetricAlarm>> => {
    const desired = input.findsert ?? input.upsert;
    const isUpsert = !!input.upsert;

    // failfast if no input
    if (!desired) BadRequestError.throw('findsert or upsert is required');

    // declare the client (regional)
    const client = new CloudWatchClient({
      region: context.aws.credentials.region,
    });

    // check if the alarm already exists
    const foundBefore = await getOneCloudwatchMetricAlarm(
      { by: { unique: { name: desired.name } } },
      context,
    );

    // findsert: return the extant alarm without overwrite
    if (foundBefore && !isUpsert) return foundBefore;

    // put the alarm (create, or overwrite on upsert)
    await client.send(
      new PutMetricAlarmCommand({
        AlarmName: desired.name,
        AlarmDescription: desired.description ?? undefined,
        Namespace: desired.namespace,
        MetricName: desired.metricName,
        Statistic: desired.statistic,
        Dimensions: desired.dimensions
          ? Object.entries(desired.dimensions).map(([Name, Value]) => ({
              Name,
              Value,
            }))
          : undefined,
        Period: desired.period,
        EvaluationPeriods: desired.evaluationPeriods,
        Threshold: desired.threshold,
        ComparisonOperator: desired.comparisonOperator,
        Unit: desired.unit ?? undefined,
        AlarmActions:
          desired.alarmActions.length > 0 ? desired.alarmActions : undefined,
        // Tags only apply on create; on update they are ignored (synced below)
        Tags:
          !foundBefore && desired.tags
            ? Object.entries(desired.tags).map(([Key, Value]) => ({
                Key,
                Value,
              }))
            : undefined,
      }),
    );

    // re-read to obtain the arn (needed to sync tags on update)
    const foundAfterPut = await getOneCloudwatchMetricAlarm(
      { by: { unique: { name: desired.name } } },
      context,
    );
    if (!foundAfterPut)
      UnexpectedCodePathError.throw('alarm not found after put', {
        name: desired.name,
      });

    // sync tags on update (create already applied them via Tags)
    if (foundBefore)
      await syncTags({
        client,
        arn: foundAfterPut.arn,
        tagsBefore: foundBefore.tags,
        tagsDesired: desired.tags,
      });

    // re-read a final time so returned tags reflect the sync
    const foundFinal = await getOneCloudwatchMetricAlarm(
      { by: { unique: { name: desired.name } } },
      context,
    );
    if (!foundFinal)
      UnexpectedCodePathError.throw('alarm not found after set', {
        name: desired.name,
      });
    return foundFinal;
  },
);

/**
 * .what = syncs alarm tags via remove-old-then-add-new
 * .why = AWS has no single "set tags" call; drift reconciles by untag-then-tag
 */
const syncTags = async (input: {
  client: CloudWatchClient;
  arn: string;
  tagsBefore: Record<string, string> | null;
  tagsDesired: Record<string, string> | null;
}): Promise<void> => {
  const { client, arn, tagsBefore, tagsDesired } = input;

  // remove old tags absent from desired
  const keysToRemove = getAllTagKeysToRemove({
    before: tagsBefore,
    desired: tagsDesired,
  });
  if (keysToRemove.length > 0)
    await client.send(
      new UntagResourceCommand({ ResourceARN: arn, TagKeys: keysToRemove }),
    );

  // add desired tags
  if (tagsDesired && Object.keys(tagsDesired).length > 0)
    await client.send(
      new TagResourceCommand({
        ResourceARN: arn,
        Tags: Object.entries(tagsDesired).map(([Key, Value]) => ({
          Key,
          Value,
        })),
      }),
    );
};
