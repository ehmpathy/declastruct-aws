import { DomainLiteral, RefByUnique } from 'domain-objects';

import { DeclaredAwsSesCloudwatchDimension } from './DeclaredAwsSesCloudwatchDimension';
import type { DeclaredAwsSnsTopic } from './DeclaredAwsSnsTopic';

/**
 * .what = the destination a configuration set's events are delivered to
 * .why = the vision models two sinks — CloudWatch (metrics by dimension) or SNS (a topic a
 *   consumer subscribes to); a CloudWatch sink adds no new resource, an SNS sink references a
 *   `DeclaredAwsSnsTopic`
 *
 * .note = exactly ONE of `cloudwatch` / `sns` is non-null (the sink kind); a value object
 *   with two nullable options, disambiguated by which is set
 */
export interface DeclaredAwsSesEventSink {
  /**
   * .what = a CloudWatch sink's dimensions (null when the sink is SNS)
   */
  cloudwatch: DeclaredAwsSesCloudwatchDimension[] | null;

  /**
   * .what = an SNS sink's topic reference (null when the sink is CloudWatch)
   */
  sns: RefByUnique<typeof DeclaredAwsSnsTopic> | null;
}

export class DeclaredAwsSesEventSink
  extends DomainLiteral<DeclaredAwsSesEventSink>
  implements DeclaredAwsSesEventSink
{
  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    cloudwatch: DeclaredAwsSesCloudwatchDimension,
    sns: RefByUnique<typeof DeclaredAwsSnsTopic>,
  };
}
