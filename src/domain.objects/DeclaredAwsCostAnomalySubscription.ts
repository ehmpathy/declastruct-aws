import { DomainEntity, RefByUnique } from 'domain-objects';

import { DeclaredAwsBudgetLimit } from './DeclaredAwsBudgetLimit';
import type { DeclaredAwsCostAnomalyMonitor } from './DeclaredAwsCostAnomalyMonitor';
import { DeclaredAwsCostAnomalySubscriber } from './DeclaredAwsCostAnomalySubscriber';
import { DeclaredAwsTags } from './DeclaredAwsTags';

/**
 * .what = an alert subscription of AWS Cost Anomaly Detection — who gets told, how
 *         often, and above what dollar impact, for a given monitor's anomalies
 * .why = declares the notification tier atop a DeclaredAwsCostAnomalyMonitor; the
 *        monitor watches the spend, this subscription routes the alerts
 *
 * .identity
 *   - @unique = [name] — subscription names are unique within an account
 *   - @metadata = [arn] — AWS assigns a SubscriptionArn on create
 *   - no @primary — a subscription is addressed by AccountId + SubscriptionName
 *
 * .note
 *   - references its monitor by unique (name); the encode turns that name into a
 *     MonitorArn via getOneCostAnomalyMonitor
 *   - Cost Explorer (which backs Cost Anomaly Detection) is a global service
 *     pinned to us-east-1 (see getAwsCostExplorerClient)
 *   - threshold reuses DeclaredAwsBudgetLimit ({ amount, unit }); the encode maps
 *     it to a ThresholdExpression on ANOMALY_TOTAL_IMPACT_ABSOLUTE
 *
 * @see https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_AnomalySubscription.html
 * @see https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_CreateAnomalySubscription.html
 */
export interface DeclaredAwsCostAnomalySubscription {
  /**
   * .what = the AWS-assigned Amazon Resource Name of the subscription
   * .note = @metadata — set by AWS on create, absent in desired state
   */
  arn?: string;

  /**
   * .what = the friendly name of the subscription
   * .note = @unique within the account
   */
  name: string;

  /**
   * .what = reference to the monitor whose anomalies this subscription alerts on
   * .note = referenced by unique (name); the encode maps it to a MonitorArn
   */
  monitor: RefByUnique<typeof DeclaredAwsCostAnomalyMonitor>;

  /**
   * .what = how often anomaly notifications are sent
   * .constraint = one of IMMEDIATE | DAILY | WEEKLY
   * .note = IMMEDIATE delivers over SNS; DAILY and WEEKLY deliver over email
   */
  frequency: 'IMMEDIATE' | 'DAILY' | 'WEEKLY';

  /**
   * .what = the dollar impact an anomaly must exceed to trigger a notification
   * .note = reuses DeclaredAwsBudgetLimit ({ amount, unit }); the encode maps it
   *         to a ThresholdExpression on ANOMALY_TOTAL_IMPACT_ABSOLUTE
   */
  threshold: DeclaredAwsBudgetLimit;

  /**
   * .what = the recipients to notify (delivery channel + address each)
   */
  subscribers: DeclaredAwsCostAnomalySubscriber[];

  /**
   * .what = optional tags for the subscription
   */
  tags: DeclaredAwsTags | null;
}

export class DeclaredAwsCostAnomalySubscription
  extends DomainEntity<DeclaredAwsCostAnomalySubscription>
  implements DeclaredAwsCostAnomalySubscription
{
  /**
   * .what = unique constraint — subscription name is unique within the account
   */
  public static unique = ['name'] as const;

  /**
   * .what = metadata — the AWS-assigned SubscriptionArn
   */
  public static metadata = ['arn'] as const;

  /**
   * .what = no readonly fields — all fields are user-defined desired state
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    monitor: RefByUnique,
    threshold: DeclaredAwsBudgetLimit,
    subscribers: DeclaredAwsCostAnomalySubscriber,
    tags: DeclaredAwsTags,
  };
}
