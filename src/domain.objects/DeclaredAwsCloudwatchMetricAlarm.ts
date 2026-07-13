import type { StandardUnit } from '@aws-sdk/client-cloudwatch';
import { DomainEntity } from 'domain-objects';

import { DeclaredAwsCloudwatchDimensions } from './DeclaredAwsCloudwatchDimensions';
import { DeclaredAwsTags } from './DeclaredAwsTags';

/**
 * .what = a generic CloudWatch metric alarm (AWS::CloudWatch::Alarm)
 * .why = declares an alarm that watches ONE metric against a static threshold and
 *        fires actions (e.g. SNS) on breach. this is the generic resource — the
 *        estimated-charges cost alarm is just ONE configuration of it, expressed
 *        via a factory, NOT a distinct domain type
 *
 * .identity
 *   - @unique = [name] — alarm names are unique within a region
 *   - no @primary — addressed by name; arn is metadata assigned by AWS
 *
 * .note
 *   - static-threshold alarms only; metric-math / anomaly-detector alarms are
 *     out of scope for this resource
 *   - the estimated-charges metric lives ONLY in us-east-1 with Currency=USD
 *
 * @see https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutMetricAlarm.html
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cw-alarm.html
 */
export interface DeclaredAwsCloudwatchMetricAlarm {
  /**
   * .what = the Amazon Resource Name of the alarm
   * .note = @metadata — assigned by aws on creation
   */
  arn?: string;

  /**
   * .what = the name of the alarm
   * .note = @unique within the region
   */
  name: string;

  /**
   * .what = optional human description of the alarm
   */
  description: string | null;

  /**
   * .what = the metric namespace (e.g. 'AWS/Lambda', 'AWS/EC2')
   */
  namespace: string;

  /**
   * .what = the metric name (e.g. 'EstimatedCharges', 'Errors')
   */
  metricName: string;

  /**
   * .what = the statistic applied to the metric over each period
   */
  statistic: 'Average' | 'Maximum' | 'Minimum' | 'SampleCount' | 'Sum';

  /**
   * .what = optional metric dimensions as a name -> value map
   *         (e.g. { Currency: 'USD' } for the estimated-charges metric); null = none
   */
  dimensions: DeclaredAwsCloudwatchDimensions | null;

  /**
   * .what = the length in seconds of each evaluation period
   * .constraint = 10, 20, 30, or any multiple of 60
   */
  period: number;

  /**
   * .what = the number of periods over which the metric is compared to threshold
   */
  evaluationPeriods: number;

  /**
   * .what = the value the statistic is compared against
   */
  threshold: number;

  /**
   * .what = the comparison between the statistic and the threshold
   */
  comparisonOperator:
    | 'GreaterThanThreshold'
    | 'GreaterThanOrEqualToThreshold'
    | 'LessThanThreshold'
    | 'LessThanOrEqualToThreshold';

  /**
   * .what = optional unit of the metric (e.g. 'None'); null = unspecified
   * .note = uses AWS's StandardUnit union to stay faithful to the API
   */
  unit: StandardUnit | null;

  /**
   * .what = ARNs of actions to fire when the alarm enters the ALARM state
   *         (e.g. an SNS topic); empty array = no actions
   */
  alarmActions: string[];

  /**
   * .what = optional tags for the alarm
   */
  tags: DeclaredAwsTags | null;
}

export class DeclaredAwsCloudwatchMetricAlarm
  extends DomainEntity<DeclaredAwsCloudwatchMetricAlarm>
  implements DeclaredAwsCloudwatchMetricAlarm
{
  /**
   * .what = unique constraint — alarm name is unique within the region
   */
  public static unique = ['name'] as const;

  /**
   * .what = metadata assigned by AWS
   */
  public static metadata = ['arn'] as const;

  /**
   * .what = no readonly fields beyond metadata
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    dimensions: DeclaredAwsCloudwatchDimensions,
    tags: DeclaredAwsTags,
  };
}
