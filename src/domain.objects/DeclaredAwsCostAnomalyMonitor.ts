import { DomainEntity } from 'domain-objects';

import { DeclaredAwsTags } from './DeclaredAwsTags';

/**
 * .what = the configuration of an aws cost anomaly monitor — a spend watcher
 * .why = declares a monitor that AWS evaluates for cost anomalies; alert
 *        subscriptions (a separate resource) reference it to notify subscribers
 *
 * .identity
 *   - @unique = [name] — monitor names are unique within an account
 *   - no @primary — AWS assigns the MonitorArn as @metadata, not an artificial id;
 *     a monitor is addressed by AccountId + MonitorName (account comes from context)
 *
 * .note
 *   - this models the MONITOR ONLY. AWS's CreateAnomalyMonitor can inline tags, but
 *     the SDK exposes independent tag CRUD, so alert subscriptions are split into
 *     their own resource that references this monitor
 *   - Cost Explorer (which backs Cost Anomaly Detection) is a global service pinned
 *     to us-east-1 (see getAwsCostExplorerClient)
 *
 * @see https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_CreateAnomalyMonitor.html
 * @see https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_AnomalyMonitor.html
 */
export interface DeclaredAwsCostAnomalyMonitor {
  /**
   * .what = the ARN of the monitor
   * .note = @metadata, assigned by AWS on create
   */
  arn?: string;

  /**
   * .what = the name of the monitor
   * .note = @unique within the account
   */
  name: string;

  /**
   * .what = the kind of the monitor
   * .constraint = DIMENSIONAL for an AWS managed monitor (tracks a dimension),
   *   CUSTOM for a customer managed monitor (tracks selected values in aggregate)
   */
  kind: 'DIMENSIONAL' | 'CUSTOM';

  /**
   * .what = the cost dimension the monitor analyzes; null for CUSTOM monitors
   * .constraint = SERVICE when kind=DIMENSIONAL, null when kind=CUSTOM
   */
  dimension: 'SERVICE' | null;

  /**
   * .what = optional tags for the monitor
   */
  tags: DeclaredAwsTags | null;
}

export class DeclaredAwsCostAnomalyMonitor
  extends DomainEntity<DeclaredAwsCostAnomalyMonitor>
  implements DeclaredAwsCostAnomalyMonitor
{
  /**
   * .what = unique constraint — monitor name is unique within the account
   */
  public static unique = ['name'] as const;

  /**
   * .what = metadata — the MonitorArn AWS assigns on create
   */
  public static metadata = ['arn'] as const;

  /**
   * .what = no readonly fields — all declared fields are user-defined desired state
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    tags: DeclaredAwsTags,
  };
}
