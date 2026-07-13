import type { MetricAlarm, Tag } from '@aws-sdk/client-cloudwatch';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import { DeclaredAwsCloudwatchMetricAlarm } from '@src/domain.objects/DeclaredAwsCloudwatchMetricAlarm';
import { DeclaredAwsTags } from '@src/domain.objects/DeclaredAwsTags';

/**
 * .what = maps an AWS MetricAlarm (+ its tags) into a DeclaredAwsCloudwatchMetricAlarm
 * .why = the AWS shape (AlarmName, Dimensions[], ...) differs from our declared
 *        shape; this cast is the single decode point
 */
export const castIntoDeclaredAwsCloudwatchMetricAlarm = (input: {
  alarm: MetricAlarm;
  tags: Tag[] | undefined;
}): HasReadonly<typeof DeclaredAwsCloudwatchMetricAlarm> => {
  const { alarm, tags } = input;

  // the statistic — we do not model percentile (ExtendedStatistic) alarms
  const statistic = alarm.Statistic;
  if (
    statistic !== 'Average' &&
    statistic !== 'Maximum' &&
    statistic !== 'Minimum' &&
    statistic !== 'SampleCount' &&
    statistic !== 'Sum'
  )
    UnexpectedCodePathError.throw(
      'alarm has an unsupported Statistic (percentile alarms are not modeled)',
      { alarm },
    );

  // the comparison — we model only static-threshold comparisons
  const comparisonOperator = alarm.ComparisonOperator;
  if (
    comparisonOperator !== 'GreaterThanThreshold' &&
    comparisonOperator !== 'GreaterThanOrEqualToThreshold' &&
    comparisonOperator !== 'LessThanThreshold' &&
    comparisonOperator !== 'LessThanOrEqualToThreshold'
  )
    UnexpectedCodePathError.throw(
      'alarm has an unsupported ComparisonOperator (anomaly-band alarms are not modeled)',
      { alarm },
    );

  // dimensions map, or null when absent
  const dimensions = (() => {
    if (!alarm.Dimensions || alarm.Dimensions.length === 0) return null;
    const obj: Record<string, string> = {};
    for (const dim of alarm.Dimensions)
      if (dim.Name) obj[dim.Name] = dim.Value ?? '';
    return obj;
  })();

  // tags map, or null when absent
  const tagsMap = (() => {
    if (!tags || tags.length === 0) return null;
    const obj: Record<string, string> = {};
    for (const tag of tags) if (tag.Key) obj[tag.Key] = tag.Value ?? '';
    return new DeclaredAwsTags(obj);
  })();

  return assure(
    new DeclaredAwsCloudwatchMetricAlarm({
      arn:
        alarm.AlarmArn ??
        UnexpectedCodePathError.throw('alarm lacks an AlarmArn', { alarm }),
      name:
        alarm.AlarmName ??
        UnexpectedCodePathError.throw('alarm lacks an AlarmName', { alarm }),
      description: alarm.AlarmDescription ?? null,
      namespace:
        alarm.Namespace ??
        UnexpectedCodePathError.throw('alarm lacks a Namespace', { alarm }),
      metricName:
        alarm.MetricName ??
        UnexpectedCodePathError.throw('alarm lacks a MetricName', { alarm }),
      statistic,
      dimensions,
      period:
        alarm.Period ??
        UnexpectedCodePathError.throw('alarm lacks a Period', { alarm }),
      evaluationPeriods:
        alarm.EvaluationPeriods ??
        UnexpectedCodePathError.throw('alarm lacks EvaluationPeriods', {
          alarm,
        }),
      threshold:
        alarm.Threshold ??
        UnexpectedCodePathError.throw('alarm lacks a Threshold', { alarm }),
      comparisonOperator,
      unit: alarm.Unit ?? null,
      alarmActions: alarm.AlarmActions ?? [],
      tags: tagsMap,
    }),
    hasReadonly({ of: DeclaredAwsCloudwatchMetricAlarm }),
  );
};
